const isDevelopment = process.env.APP_VARIANT === 'development';

/** @type {import('expo/config').Config} */
module.exports = ({ config }) => ({
  ...config,
  name: isDevelopment ? 'Fitness Forge Dev' : 'Fitness Forge',
  slug: 'fitness-forge',
  owner: 'jystringfellow',
  scheme: isDevelopment ? 'fitnessforge-dev' : 'fitnessforge',
  version: '0.1.0',
  icon: './assets/icon.png',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  backgroundColor: '#050406',
  splash: {
    image: './assets/icon.png',
    resizeMode: 'contain',
    backgroundColor: '#050406'
  },
  android: {
    package: isDevelopment
      ? 'com.jystringfellow.fitnessforge.dev'
      : 'com.jystringfellow.fitnessforge',
    adaptiveIcon: {
      foregroundImage: './assets/icon.png',
      backgroundColor: '#050406'
    },
    permissions: ['android.permission.MODIFY_AUDIO_SETTINGS']
  },
  ios: {
    bundleIdentifier: isDevelopment
      ? 'com.jystringfellow.fitnessforge.dev'
      : 'com.jystringfellow.fitnessforge',
    supportsTablet: false,
    config: {
      usesNonExemptEncryption: false
    }
  },
  plugins: [
    'expo-router',
    [
      'expo-audio',
      {
        microphonePermission: false,
        recordAudioAndroid: false
      }
    ],
    'expo-asset',
    [
      'expo-dev-client',
      {
        addGeneratedScheme: isDevelopment
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  },
  web: {
    bundler: 'metro',
    favicon: './assets/icon.png'
  },
  extra: {
    router: {},
    eas: {
      projectId: 'cf9f38ac-ec46-4738-95b5-937a30154446'
    }
  }
});
