import { TextInput } from 'react-native';

// On Android, the soft keyboard's "next" button both fires onSubmitEditing
// and, in the same native pass, hides/blurs the current input — a race that
// beats a synchronous ref.focus() call and just closes the keyboard instead
// of moving focus. Deferring to the next tick lets that native pass finish
// first so the new focus actually sticks.
export function focusInput(node: TextInput | null | undefined) {
  setTimeout(() => node?.focus(), 50);
}
