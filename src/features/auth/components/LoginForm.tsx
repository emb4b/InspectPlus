import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../../../constants/colors';
import { useAuth } from '../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { focusInput } from '../../../components/form';

export const LoginForm: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const { login, isLoading, error, clearError } = useAuth();

  const handleLogin = (asAdmin = false) => {
    clearError();
    login({ username, password }, asAdmin);
  };

  return (
    <View style={styles.card}>
      {/* Username */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Email or Username</Text>
        <TextInput
          style={[styles.input, usernameFocused && styles.inputFocused]}
          placeholder="Enter username"
          placeholderTextColor={Colors.textMuted}
          value={username}
          onChangeText={setUsername}
          onFocus={() => setUsernameFocused(true)}
          onBlur={() => setUsernameFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => focusInput(passwordRef.current)}
        />
      </View>

      {/* Password */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Password</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            ref={passwordRef}
            style={[styles.input, styles.inputWithIcon,
              passwordFocused && styles.inputFocused]}
            placeholder="Enter password"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            secureTextEntry={!showPassword}
            returnKeyType="done"
            onSubmitEditing={() => handleLogin(false)}
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword(v => !v)}
            activeOpacity={0.7}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Error */}
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.btnPrimary, isLoading && styles.btnDisabled]}
          onPress={() => handleLogin(false)}
          disabled={isLoading}
          activeOpacity={0.85}>
          {isLoading ? (
            <ActivityIndicator color={Colors.textWhite} size="small" />
          ) : (
            <Text style={styles.btnPrimaryText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnSecondary, isLoading && styles.btnDisabled]}
          onPress={() => handleLogin(true)}
          disabled={isLoading}
          activeOpacity={0.85}>
          <Text style={styles.btnSecondaryText}>Login as Administrator</Text>
        </TouchableOpacity>
      </View>

      {/* Forgot password */}
      <TouchableOpacity style={styles.forgotWrap} activeOpacity={0.7}>
        <Text style={styles.forgotText}>Forgot Password</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgLight,
    borderRadius: 12,
    padding: 20,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  inputFocused: {
    borderColor: Colors.green,
  },
  errorText: {
    fontSize: 12,
    color: Colors.hazwaste.text,
    marginBottom: 10,
    marginTop: -4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: Colors.navy,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    color: Colors.textWhite,
    fontSize: 13,
    fontWeight: '700',
  },
  btnSecondary: {
    flex: 1.6,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  forgotWrap: {
    alignItems: 'center',
  },
  forgotText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputWithIcon: {
    paddingRight: 44,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
});
