import { useEffect, useRef, useState } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useWorkoutWakeLock } from '@/hooks/useWorkoutWakeLock';
import { displayStepText, hasLoggedLinkedSet, nextStepAnnouncement, shouldAnnounceNextStep, shouldPlayRestCountdownCue, shouldWaitForLinkedLog } from '@/lib/forgeWorkoutFlow';
import { ForgeSetResult, loadCurrentWorkout, loadForgeSetResults, saveForgeSetResults, saveForgeStepIndex, setCurrentWorkout } from '@/storage/workoutStorage';
import { recordForgeCompletion } from '@/storage/appStorage';
import { brandIcon, theme } from '@/theme/brand';
import { WorkoutIntervalStep, WorkoutPlan } from '@/types/workout';

type TimerState = 'idle' | 'running' | 'paused' | 'completed';
const transitionChime = require('../assets/timer-switch.wav');
const countdownChime = require('../assets/timer-countdown.wav');
export default function WorkoutScreen() {
  const params = useLocalSearchParams<{ plan?: string }>();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadPlan = async () => {
      try {
        if (params.plan) {
          const routePlan = JSON.parse(params.plan) as WorkoutPlan;
          await setCurrentWorkout(routePlan);
          if (mounted) {
            setPlan(routePlan);
          }
          return;
        }

        const storedPlan = await loadCurrentWorkout();
        if (mounted) {
          setPlan(storedPlan);
        }
      } catch {
        if (mounted) {
          setPlan(null);
        }
      } finally {
        if (mounted) {
          setIsLoadingPlan(false);
        }
      }
    };

    loadPlan();

    return () => {
      mounted = false;
    };
  }, [params.plan]);

  if (isLoadingPlan) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>Loading workout...</Text>
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>Generate a workout first.</Text>
      </View>
    );
  }

  return (
    <TimerView plan={plan} />
  );
}

function TimerView({ plan }: { plan: WorkoutPlan }) {
  const router = useRouter();
  const steps = plan.intervalSteps?.length ? plan.intervalSteps : [];
  const [timerState, setTimerState] = useState<TimerState>(plan.currentStepIndex === steps.length ? 'completed' : 'idle');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(plan.currentStepIndex ?? 0);
  const [repCount, setRepCount] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(() => steps[plan.currentStepIndex ?? 0]?.durationSecs ?? 0);
  const [setResults, setSetResults] = useState<ForgeSetResult[]>([]);
  const [linkedReps, setLinkedReps] = useState('');
  const [linkedAssistance, setLinkedAssistance] = useState(0);
  const [savingSet, setSavingSet] = useState(false);
  const [saveError, setSaveError] = useState('');
  const transitionPlayer = useAudioPlayer(transitionChime);
  const restCuePlayer = useAudioPlayer(countdownChime);
  const recordedCompletionRef = useRef(false);
  const linkedRepsInputRef = useRef<TextInput>(null);

  useWorkoutWakeLock(timerState !== 'completed', 'fitness-forge-forge-workout');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spokenWarningRef = useRef<string | null>(null);
  const playedRestCueRef = useRef<string | null>(null);
  const currentStep = steps[currentStepIndex] ?? null;
  const currentLinkedLogged = hasLoggedLinkedSet(currentStep, setResults);
  const nextStep = steps[currentStepIndex + 1] ?? null;
  const progressPercent = steps.length ? Math.min(100, Math.round((currentStepIndex / steps.length) * 100)) : 0;
  const timerToneStyle = currentStep?.isPrompt
    ? styles.promptTone
    : currentStep?.isRest
      ? styles.restTone
      : styles.workTone;

  useEffect(() => {
    loadForgeSetResults(plan.createdAt).then(setSetResults).catch(() => {});
  }, [plan.createdAt]);

  useEffect(() => {
    const linked = currentStep?.linkedSet;
    if (!linked) return;
    const logged = setResults.find((item) => item.exerciseId === linked.exerciseId && item.setIndex === linked.setIndex);
    setLinkedReps(logged ? String(logged.actualReps) : '');
    setLinkedAssistance(logged?.actualAssistanceLb ?? linked.targetAssistanceLb ?? 0);
  }, [currentStepIndex, setResults, plan.createdAt]);

  const saveLinkedSet = async (status: ForgeSetResult['status'], advanceAfterSave = false) => {
    const linked = currentStep?.linkedSet;
    if (!linked || savingSet) return;
    if (status === 'completed' && linkedReps === '') {
      setSaveError('Enter the reps you actually completed.');
      linkedRepsInputRef.current?.focus();
      return;
    }
    setSavingSet(true);
    try {
      const result: ForgeSetResult = { exerciseId: linked.exerciseId, setIndex: linked.setIndex,
        actualReps: status === 'completed' ? Number(linkedReps) : 0, actualAssistanceLb: linked.targetAssistanceLb === undefined ? undefined : linkedAssistance, status };
      const latest = await loadForgeSetResults(plan.createdAt);
      const next = [...latest.filter((item) => item.exerciseId !== linked.exerciseId || item.setIndex !== linked.setIndex), result];
      await saveForgeSetResults(plan.createdAt, next);
      setSetResults(next);
      setSaveError('');
      if (!currentStep?.isRest || timeRemaining === 0 || advanceAfterSave) goToStep(currentStepIndex + 1, true);
    } catch {
      setSaveError('Could not save this set. Try again.');
    } finally { setSavingSet(false); }
  };

  const playTransitionSound = () => {
    transitionPlayer
      .seekTo(0)
      .then(() => transitionPlayer.play())
      .catch(() => {
        // The timer should keep moving even if the platform refuses audio playback.
      });
  };

  const goToStep = (nextIndex: number, autoStart: boolean) => {
    Speech.stop();
    spokenWarningRef.current = null;

    if (nextIndex >= steps.length) {
      setTimerState('completed');
      setCurrentStepIndex(steps.length);
      saveForgeStepIndex(plan.createdAt, steps.length).catch(() => {});
      setRepCount(0);
      setTimeRemaining(0);
      return;
    }

    const nextStep = steps[nextIndex];
    playTransitionSound();
    setCurrentStepIndex(nextIndex);
    saveForgeStepIndex(plan.createdAt, nextIndex).catch(() => {});
    setRepCount(0);
    setTimeRemaining(nextStep.durationSecs);
    setTimerState(autoStart && nextStep.durationSecs > 0 && !nextStep.reps && !nextStep.isPrompt ? 'running' : 'idle');
  };

  useEffect(() => {
    Speech.stop();
    spokenWarningRef.current = null;
    playedRestCueRef.current = null;
    setTimerState(plan.currentStepIndex === steps.length ? 'completed' : 'idle');
    setCurrentStepIndex(plan.currentStepIndex ?? 0);
    setRepCount(0);
    setTimeRemaining(steps[plan.currentStepIndex ?? 0]?.durationSecs ?? 0);

    return () => {
      Speech.stop();
    };
  }, [plan.createdAt]);

  useEffect(() => {
    if (timerState === 'completed' && !recordedCompletionRef.current) {
      recordedCompletionRef.current = true;
      loadForgeSetResults(plan.createdAt).then((results) => recordForgeCompletion(plan, results)).then(() => setSaveError('')).catch(() => {
        recordedCompletionRef.current = false;
        setSaveError('Could not save this workout. Tap Retry save.');
      });
    }
  }, [plan, timerState]);

  const retryCompletion = () => {
    if (recordedCompletionRef.current) return;
    recordedCompletionRef.current = true;
    loadForgeSetResults(plan.createdAt).then((results) => recordForgeCompletion(plan, results))
      .then(() => setSaveError(''))
      .catch(() => { recordedCompletionRef.current = false; setSaveError('Could not save this workout. Tap Retry save.'); });
  };

  useEffect(() => {
    transitionPlayer.volume = 0.75;
    restCuePlayer.volume = 0.35;
    setAudioModeAsync({
      playsInSilentMode: true
    }).catch(() => {
      // The sound still works on most targets when audio mode setup is unavailable.
    });
  }, [transitionPlayer, restCuePlayer]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (timerState === 'running') {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setTimeout(() => {
              if (shouldWaitForLinkedLog(currentStep, setResults)) setTimerState('idle');
              else goToStep(currentStepIndex + 1, true);
            }, 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerState, currentStepIndex, currentLinkedLogged]);

  useEffect(() => {
    if (!shouldPlayRestCountdownCue(currentStep, nextStep, timeRemaining, timerState === 'running')) return;
    const cueKey = `${currentStepIndex}-${timeRemaining}`;
    if (playedRestCueRef.current === cueKey) return;
    playedRestCueRef.current = cueKey;
    restCuePlayer.seekTo(0).then(() => restCuePlayer.play()).catch(() => {
      // The visual timer remains authoritative if playback is unavailable.
    });
  }, [currentStep, currentStepIndex, nextStep, restCuePlayer, timeRemaining, timerState]);

  useEffect(() => {
    if (!shouldAnnounceNextStep(currentStep, nextStep, timeRemaining, timerState === 'running')) {
      return;
    }

    const announcement = nextStepAnnouncement(nextStep, steps[currentStepIndex + 2] ?? null);
    if (!announcement) return;
    const announcementKey = `${currentStepIndex}-${announcement}`;
    if (spokenWarningRef.current === announcementKey) {
      return;
    }

    spokenWarningRef.current = announcementKey;
    Speech.speak(announcement, {
      rate: 0.92
    });
  }, [currentStep, currentStepIndex, nextStep, timeRemaining, timerState]);

  const handleRepComplete = () => {
    if (!currentStep?.reps) {
      return;
    }

    const nextRepCount = repCount + 1;
    setRepCount(nextRepCount);

    if (nextRepCount >= currentStep.reps) {
      setTimeout(() => goToStep(currentStepIndex + 1, true), 250);
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatProgress = (): string => {
    if (!currentStep) {
      return 'Workout complete';
    }

    const section = currentStep.section ? currentStep.section[0].toUpperCase() + currentStep.section.slice(1) : 'Workout';
    const round = currentStep.round && currentStep.totalRounds ? ` · ${currentStep.round}/${currentStep.totalRounds}` : '';
    return `${section}${round}`;
  };

  const sectionLabel = () => {
    return currentStep?.section ? currentStep.section.toUpperCase() : 'SESSION';
  };

  const currentExerciseName = () => {
    return currentStep ? displayStepText(currentStep) : 'DONE -- you are amazing!';
  };

  const toggleTimer = () => {
    if (!currentStep) {
      return;
    }

    if (currentStep.linkedSet && !currentStep.isRest) {
      saveLinkedSet('completed').catch(() => {});
    } else if (timerState === 'running') {
      setTimerState('paused');
    } else if (timerState === 'paused') {
      setTimerState('running');
    } else if (currentStep.isRest && currentStep.linkedSet && timeRemaining === 0) {
      if (currentLinkedLogged) goToStep(currentStepIndex + 1, true);
      else saveLinkedSet('completed').catch(() => {});
    } else if (currentStep.isPrompt) {
      goToStep(currentStepIndex + 1, true);
    } else if (currentStep.reps) {
      handleRepComplete();
    } else if (currentStep.durationSecs > 0) {
      setTimerState('running');
    } else {
      goToStep(currentStepIndex + 1, true);
    }
  };

  const resetTimer = () => {
    Speech.stop();
    spokenWarningRef.current = null;
    playedRestCueRef.current = null;
    setTimerState('idle');
    setCurrentStepIndex(0);
    saveForgeStepIndex(plan.createdAt, 0).catch(() => {});
    setRepCount(0);
    setTimeRemaining(steps[0]?.durationSecs ?? 0);
  };

  const displayValue = () => {
    if (!currentStep) {
      return 'Done';
    }

    if (currentStep.isPrompt) {
      return 'Ready';
    }

    if (currentStep.reps) {
      return `${repCount}/${currentStep.reps}`;
    }

    return formatTime(timeRemaining);
  };

  const timerSubText = () => {
    if (!currentStep) {
      return 'DONE -- you are amazing!';
    }

    if (timerState === 'paused') {
      return 'Paused';
    }

    if (timerState === 'running') {
      return currentStep.isRest ? 'Rest' : 'Work';
    }

    if (currentStep.isRest && currentStep.linkedSet && timeRemaining === 0) {
      return currentLinkedLogged ? 'Ready for the next station' : 'Log reps to continue';
    }

    if (currentStep.isPrompt) {
      return `Tap "${currentStep.actionLabel ?? 'Continue'}" to continue`;
    }

    if (currentStep.reps) {
      return 'Tap +1 rep as you go';
    }

    return 'Ready';
  };

  const primaryLabel = () => {
    if (currentStep?.linkedSet && !currentStep.isRest) return savingSet ? 'Saving…' : 'Record set';
    if (timerState === 'running') {
      return 'Pause';
    }

    if (timerState === 'paused') {
      return 'Resume';
    }

    if (currentStep?.isRest && currentStep.linkedSet && timeRemaining === 0) return savingSet ? 'Saving…' : currentLinkedLogged ? 'Continue' : 'Log reps to continue';

    if (currentStep?.isPrompt) {
      return currentStep.actionLabel ?? 'Continue';
    }

    if (currentStep?.reps) {
      return '+1 Rep';
    }

    return 'Start';
  };

  const isCurrentExercise = (exerciseName: string) => {
    return currentStep?.section === 'main' && currentStep.exerciseName === exerciseName && !currentStep.isRest;
  };

  const mainBlockSummary = () => {
    return plan.mainBlock.format
      ? `${plan.mainBlock.rounds} rounds · ${plan.mainBlock.format}`
      : `${plan.mainBlock.rounds} rounds · ${plan.mainBlock.workSeconds}s work / ${plan.mainBlock.restSeconds}s rest`;
  };

  const roundTimingLines = plan.mainBlock.roundIntervals?.map(
    (interval, index) =>
      `Round ${index + 1}: ${interval.label} · ${interval.workSeconds}s work / ${interval.restSeconds}s rest`
  ) ?? [];

  if (timerState === 'completed') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.headerTitle}>{plan.title}</Text>
        <Text style={styles.headerMeta}>Attachment: {plan.input.attachment}</Text>
        <Text style={styles.doneText}>DONE -- you are amazing!</Text>
        {saveError ? <><Text style={styles.saveError}>{saveError}</Text><TouchableOpacity style={styles.nextButton} onPress={retryCompletion}><Text style={styles.nextButtonText}>Retry save</Text></TouchableOpacity></> : null}

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Cardio / Plyo ({plan.cardioBlock[0].text})</Text>
          {plan.cardioBlock.slice(1).map((item, idx) => (
            <Text key={idx} style={styles.line}>• {item.text}</Text>
          ))}
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Main Block</Text>
          <Text style={styles.line}>{mainBlockSummary()}</Text>
          {roundTimingLines.map((line) => (
            <Text key={line} style={styles.line}>• {line}</Text>
          ))}
          {plan.mainBlock.exercises.map((exercise) => (
            <View key={exercise.id} style={styles.exerciseRow}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.cue}>{exercise.cue}</Text>
            </View>
          ))}
        </View>

        {plan.note ? <Text style={styles.note}>{plan.note}</Text> : null}

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.generateButton} onPress={() => router.push('/forge')}>
            <Text style={styles.generateText}>Generate Another</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetButton} onPress={resetTimer}>
            <Text style={styles.resetText}>Restart Workout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={brandIcon} style={styles.headerMark} />
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>{plan.title}</Text>
          <Text style={styles.headerMeta}>Attachment: {plan.input.attachment}</Text>
        </View>
      </View>

      <View style={[styles.timerSection, timerToneStyle]}>
        <View style={styles.timerTopline}>
          <Text style={styles.sectionPill}>{sectionLabel()}</Text>
        </View>
        <View style={styles.timerDial}>
          <Text style={styles.timerLabel}>{currentExerciseName()}</Text>
          <Text style={styles.timerDisplay}>{displayValue()}</Text>
          <Text style={styles.timerSub}>{timerSubText()}</Text>
        </View>
        <View style={styles.sessionProgressTrack}>
          <View style={[styles.sessionProgressFill, { width: `${progressPercent}%` }]} />
        </View>
        {nextStep ? (
          <Text style={styles.upNext}>Next: {displayStepText(nextStep)}</Text>
        ) : (
          <Text style={styles.upNext}>Final step</Text>
        )}
      </View>

      <View style={styles.progressSection}>
        <Text style={styles.progressText}>{formatProgress()}</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={resetTimer}>
          <Text style={styles.controlText}>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={timerState === 'running' ? styles.pauseButton : styles.playButton}
          onPress={toggleTimer}
        >
          <Text style={[styles.controlText, styles.primaryControlText]}>{primaryLabel()}</Text>
        </TouchableOpacity>
      </View>

      {currentStep?.linkedSet ? <View style={styles.linkedControls}>
        <Text style={styles.line}>BUILD target: {currentStep.linkedSet.targetReps} reps{currentStep.linkedSet.targetAssistanceLb === undefined ? '' : ` · ${currentStep.linkedSet.targetAssistanceLb} lb assistance`}</Text>
        <View style={styles.linkedRow}><Text style={styles.line}>Actual reps</Text><TouchableOpacity onPress={() => setLinkedReps(String(Math.max(0, Number(linkedReps || 0) - 1)))}><Text style={styles.linkedButton}>−</Text></TouchableOpacity><TextInput ref={linkedRepsInputRef} accessibilityLabel="Actual reps" keyboardType="number-pad" style={styles.linkedInput} value={linkedReps} onChangeText={(value) => setLinkedReps(value.replace(/[^0-9]/g, ''))} placeholder="Enter reps" placeholderTextColor={theme.colors.textSubtle} /><TouchableOpacity onPress={() => setLinkedReps(String(Number(linkedReps || 0) + 1))}><Text style={styles.linkedButton}>+</Text></TouchableOpacity></View>
        {currentStep.linkedSet.targetAssistanceLb !== undefined ? <View style={styles.linkedRow}><Text style={styles.line}>Assistance (lb)</Text><TouchableOpacity onPress={() => setLinkedAssistance(Math.max(0, linkedAssistance - 5))}><Text style={styles.linkedButton}>−5</Text></TouchableOpacity><Text style={styles.line}>{linkedAssistance}</Text><TouchableOpacity onPress={() => setLinkedAssistance(linkedAssistance + 5)}><Text style={styles.linkedButton}>+5</Text></TouchableOpacity></View> : null}
        <Text style={styles.line}>{currentStep.isRest ? 'Rest is running while you log your reps.' : 'Record what you completed.'} The next BUILD target uses these results.</Text>
        {currentStep.isRest ? <TouchableOpacity style={styles.logButton} onPress={() => saveLinkedSet('completed').catch(() => {})}><Text style={styles.logButtonText}>{savingSet ? 'Saving…' : currentLinkedLogged ? 'Update reps' : 'Record reps'}</Text></TouchableOpacity> : null}
        {currentStep.isRest && currentLinkedLogged ? <Text style={styles.loggedText}>Set recorded. Rest continues.</Text> : null}
        {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}
      </View> : null}

      <View style={styles.nextButtonContainer}>
        {currentStep && !currentStep.isPrompt && (
          <TouchableOpacity style={styles.nextButton} onPress={() => currentStep.linkedSet ? currentStep.isRest && currentLinkedLogged ? goToStep(currentStepIndex + 1, true) : saveLinkedSet('skipped', true).catch(() => {}) : goToStep(currentStepIndex + 1, true)}>
            <Text style={styles.nextButtonText}>{currentStep.linkedSet ? currentStep.isRest ? currentLinkedLogged ? 'Skip rest' : 'Skip log and rest' : 'Skip set' : 'Skip to Next'}</Text>
          </TouchableOpacity>
        )}
        {currentStep?.skipLabel && (
          <TouchableOpacity style={styles.nextButton} onPress={() => goToStep(steps.length, false)}>
            <Text style={styles.nextButtonText}>{currentStep.skipLabel}</Text>
          </TouchableOpacity>
        )}
      </View>

      {!currentStep?.linkedSet ? <ScrollView style={styles.previewSection} contentContainerStyle={styles.previewContent}>
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Cardio / Plyo ({plan.cardioBlock[0].text})</Text>
          {plan.cardioBlock.slice(1).map((item, idx) => (
            <Text key={idx} style={styles.line}>• {item.text}</Text>
          ))}
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Main Block</Text>
          <Text style={styles.line}>{mainBlockSummary()}</Text>
          {roundTimingLines.map((line) => (
            <Text key={line} style={styles.line}>• {line}</Text>
          ))}
          {plan.mainBlock.exercises.map((exercise) => (
            <View key={exercise.id} style={styles.exerciseRow}>
              <Text style={styles.exerciseName}>
                {isCurrentExercise(exercise.name) ? '▶ ' : ''}{exercise.name}
              </Text>
              <Text style={styles.cue}>{exercise.cue}</Text>
            </View>
          ))}
        </View>

        {plan.note ? <Text style={styles.note}>{plan.note}</Text> : null}
      </ScrollView> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 18, gap: 14, paddingBottom: 30 },
  centered: { flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' },
  empty: { color: theme.colors.text, fontSize: 18 },

  header: {
    padding: 18,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderMuted,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  headerMark: { width: 58, height: 58 },
  headerCopy: { flex: 1 },
  headerTitle: { color: theme.colors.text, fontSize: 24, fontWeight: '900' },
  headerMeta: { color: theme.colors.textMuted, marginTop: 4, fontWeight: '700', textTransform: 'capitalize' },
  doneText: { color: theme.colors.lime, fontSize: 24, fontWeight: '900', marginTop: 12 },

  timerSection: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    padding: 18,
    gap: 14
  },
  workTone: { borderLeftColor: theme.colors.lime, borderLeftWidth: 5 },
  restTone: { borderLeftColor: theme.colors.purple, borderLeftWidth: 5 },
  promptTone: { borderLeftColor: theme.colors.purpleDeep, borderLeftWidth: 5 },
  timerTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionPill: {
    color: theme.colors.ink,
    backgroundColor: theme.colors.purple,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '900'
  },
  timerDial: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundRaised,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 210,
    padding: 18
  },
  timerLabel: { color: theme.colors.textSoft, fontSize: 18, marginBottom: 8, textAlign: 'center', fontWeight: '800' },
  timerDisplay: {
    color: theme.colors.text,
    fontSize: 76,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center'
  },
  timerSub: { color: theme.colors.textMuted, marginTop: 8, fontSize: 14, textAlign: 'center', fontWeight: '700' },
  sessionProgressTrack: { height: 8, backgroundColor: theme.colors.border, borderRadius: 999, overflow: 'hidden' },
  sessionProgressFill: { height: 8, backgroundColor: theme.colors.lime, borderRadius: 999 },
  upNext: { color: theme.colors.textSoft, textAlign: 'center', fontWeight: '700' },

  progressSection: { padding: 12, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border, borderBottomWidth: 1 },
  progressText: { color: theme.colors.lime, textAlign: 'center', fontSize: 15, fontWeight: '800' },

  controls: { flexDirection: 'row', gap: 12, padding: 14, backgroundColor: theme.colors.background },
  linkedControls: { backgroundColor: theme.colors.surface, padding: 14, gap: 8 },
  linkedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  linkedButton: { color: theme.colors.lime, fontWeight: '900', fontSize: 24, minWidth: 42, textAlign: 'center' },
  linkedInput: { color: theme.colors.text, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 8, padding: 8, minWidth: 84, textAlign: 'center' },
  logButton: { backgroundColor: theme.colors.lime, borderRadius: 8, padding: 11, alignItems: 'center' },
  logButtonText: { color: theme.colors.ink, fontWeight: '900' },
  loggedText: { color: theme.colors.lime, fontWeight: '800' },
  saveError: { color: theme.colors.purple, paddingHorizontal: 14, fontWeight: '800' },
  controlButton: { flex: 1, backgroundColor: theme.colors.borderMuted, borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  playButton: { flex: 1, backgroundColor: theme.colors.lime, borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  pauseButton: { flex: 1, backgroundColor: theme.colors.purple, borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  controlText: { color: theme.colors.text, fontSize: 18, fontWeight: '900' },
  primaryControlText: { color: theme.colors.ink },

  nextButtonContainer: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 14, flexWrap: 'wrap', backgroundColor: theme.colors.background },
  nextButton: { flex: 1, backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  repButton: { flex: 1, backgroundColor: theme.colors.purple, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  nextButtonText: { color: theme.colors.textSoft, fontSize: 16, fontWeight: '800' },
  repButtonText: { color: theme.colors.ink, fontSize: 16, fontWeight: '900' },

  previewSection: { flex: 1 },
  previewContent: { padding: 16, gap: 12, backgroundColor: theme.colors.background },

  block: { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderMuted, borderWidth: 1, borderRadius: 8, padding: 14, gap: 8 },
  blockTitle: { color: theme.colors.purple, fontWeight: '900', fontSize: 16 },
  line: { color: theme.colors.textSoft },
  exerciseRow: { borderTopColor: theme.colors.borderMuted, borderTopWidth: 1, paddingTop: 10, marginTop: 8 },
  exerciseName: { color: theme.colors.text, fontWeight: '900' },
  cue: { color: theme.colors.textMuted, fontSize: 13, marginTop: 3, lineHeight: 18 },
  note: { color: theme.colors.lime, fontStyle: 'italic', fontWeight: '700' },

  generateButton: { backgroundColor: theme.colors.lime, borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  generateText: { color: theme.colors.ink, fontWeight: '900' },
  buttonContainer: { gap: 12, padding: 16 },
  resetButton: { backgroundColor: theme.colors.danger, borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  resetText: { color: theme.colors.text, fontWeight: '900' }
});
