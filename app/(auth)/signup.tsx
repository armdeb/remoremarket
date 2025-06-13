import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Eye, EyeOff, Mail, Lock, User, Phone, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthService } from '~/lib/auth';
import { useAuth } from '~/contexts/AuthContext';
import { ThemedView } from '~/components/ThemedView';
import { ThemedText } from '~/components/ThemedText';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    phone: '',
    firstName: '',
    lastName: '',
    profilePicture: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [nicknameChecking, setNicknameChecking] = useState(false);

  // Real-time nickname availability check
  useEffect(() => {
    const checkNickname = async () => {
      if (formData.nickname.length >= 3) {
        setNicknameChecking(true);
        try {
          const available = await AuthService.checkNicknameAvailability(formData.nickname);
          setNicknameAvailable(available);
        } catch (error) {
          console.error('Nickname check error:', error);
        } finally {
          setNicknameChecking(false);
        }
      } else {
        setNicknameAvailable(null);
      }
    };

    const debounceTimer = setTimeout(checkNickname, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData.nickname]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFormData(prev => ({ ...prev, profilePicture: result.assets[0].uri }));
    }
  };

  const handleSignUp = async () => {
    // Validation
    if (!formData.email || !formData.password || !formData.nickname) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (!nicknameAvailable) {
      Alert.alert('Error', 'Please choose an available nickname');
      return;
    }

    try {
      setLoading(true);
      await signUp(formData);
      Alert.alert('Success', 'Account created successfully! Please check your email for verification.');
      router.replace('/(auth)/login');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(colors);

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <ThemedText style={styles.logoText}>R</ThemedText>
              </View>
            </View>
            <ThemedText type="title" style={styles.title}>Join Remore</ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              Create your account to start buying and selling
            </ThemedText>
          </View>

          {/* Profile Picture */}
          <TouchableOpacity style={styles.profilePictureContainer} onPress={pickImage}>
            {formData.profilePicture ? (
              <Image source={{ uri: formData.profilePicture }} style={styles.profilePicture} />
            ) : (
              <View style={[styles.profilePicturePlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Camera size={32} color={colors.textSecondary} />
                <ThemedText style={[styles.profilePictureText, { color: colors.textSecondary }]}>
                  Add Photo
                </ThemedText>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.form}>
            {/* Email */}
            <View style={styles.inputContainer}>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Email *</ThemedText>
              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Mail size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={formData.email}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            {/* Nickname */}
            <View style={styles.inputContainer}>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Nickname *</ThemedText>
              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <User size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={formData.nickname}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, nickname: text }))}
                  placeholder="Choose a unique nickname"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                />
                {nicknameChecking && (
                  <View style={styles.nicknameStatus}>
                    <ThemedText style={[styles.statusText, { color: colors.textSecondary }]}>...</ThemedText>
                  </View>
                )}
                {nicknameAvailable === true && (
                  <View style={styles.nicknameStatus}>
                    <ThemedText style={[styles.statusText, { color: colors.success }]}>✓</ThemedText>
                  </View>
                )}
                {nicknameAvailable === false && (
                  <View style={styles.nicknameStatus}>
                    <ThemedText style={[styles.statusText, { color: colors.error }]}>✗</ThemedText>
                  </View>
                )}
              </View>
              {nicknameAvailable === false && (
                <ThemedText style={[styles.errorText, { color: colors.error }]}>
                  This nickname is already taken
                </ThemedText>
              )}
            </View>

            {/* Name Fields */}
            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <ThemedText style={[styles.label, { color: colors.textSecondary }]}>First Name</ThemedText>
                <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={formData.firstName}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, firstName: text }))}
                    placeholder="First name"
                    placeholderTextColor={colors.textSecondary}
                    autoComplete="given-name"
                  />
                </View>
              </View>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Last Name</ThemedText>
                <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={formData.lastName}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, lastName: text }))}
                    placeholder="Last name"
                    placeholderTextColor={colors.textSecondary}
                    autoComplete="family-name"
                  />
                </View>
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Password *</ThemedText>
              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Lock size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={formData.password}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
                  placeholder="Create a password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={colors.textSecondary} />
                  ) : (
                    <Eye size={20} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Confirm Password *</ThemedText>
              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Lock size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={formData.confirmPassword}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, confirmPassword: text }))}
                  placeholder="Confirm your password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="new-password"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color={colors.textSecondary} />
                  ) : (
                    <Eye size={20} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.signUpButton, { backgroundColor: colors.primary }, loading && styles.disabledButton]} 
            onPress={handleSignUp}
            disabled={loading}
          >
            <ThemedText style={styles.signUpButtonText}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </ThemedText>
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <ThemedText style={[styles.loginText, { color: colors.textSecondary }]}>
              Already have an account?{' '}
            </ThemedText>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <ThemedText style={[styles.loginLink, { color: colors.primary }]}>
                  Sign in
                </ThemedText>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: colors.primary,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  profilePictureContainer: {
    alignSelf: 'center',
    marginBottom: 32,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profilePicturePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  profilePictureText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginTop: 4,
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  eyeButton: {
    padding: 4,
  },
  nicknameStatus: {
    paddingHorizontal: 8,
  },
  statusText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  signUpButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  signUpButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  loginLink: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});