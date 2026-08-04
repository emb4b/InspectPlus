import { useCallback } from 'react';
import { Keyboard, ScrollView, TextInput, UIManager, findNodeHandle } from 'react-native';
import { KeyboardEvents } from 'react-native-keyboard-controller';

const SCROLL_TOP_PADDING = 16;

function performScroll(
  scrollRef: React.RefObject<ScrollView | null>,
  fieldRef: React.RefObject<TextInput | null>,
) {
  const scrollNode = scrollRef.current;
  const field = fieldRef.current;
  if (!scrollNode || !field) return;

  const fieldHandle = findNodeHandle(field);
  const scrollHandle = findNodeHandle(scrollNode);
  if (!fieldHandle || !scrollHandle) return;

  UIManager.measureLayout(
    fieldHandle,
    scrollHandle,
    () => {},
    (_x: number, y: number) => {
      scrollNode.scrollTo({ y: Math.max(0, y - SCROLL_TOP_PADDING), animated: true });
    },
  );
}

// Scrolls a focused field into view above the keyboard. Android's
// windowSoftInputMode="adjustResize" (see AndroidManifest.xml) resizes the
// window when the keyboard opens, but that alone doesn't guarantee a
// focused field inside a ScrollView ends up above the keyboard — under the
// new architecture the ScrollView responder chain's built-in auto-scroll is
// unreliable, so screens wire this explicitly via
// `onFocus={() => scrollToInput(fieldRef)}` on every field. No field
// ordering required — works for any field regardless of how many others
// exist on the screen.
//
// Calling .measureLayout() on the field ref directly fails at runtime on
// the New Architecture with "ref.measureLayout must be called with a
// reference to a native component" (even though it type-checks) — this
// app's TextField/DateField forwardRef doubly-wraps the underlying
// TextInput. Using the UIManager.measureLayout static with plain node
// handles (findNodeHandle) sidesteps it.
//
// Known remaining limitation (see PR/issue notes): on-device testing found
// that scrollTo() can silently no-op — the JS call executes and returns
// normally, measureLayout reports a correct target, but the native scroll
// position doesn't move — specifically when it's invoked during or shortly
// after the very keyboard-open transition that triggers adjustResize's
// window resize. Re-resolving refs fresh at call time was verified NOT to
// fix that specific case. Scrolling while the keyboard is already open
// (i.e. chaining between fields) is unaffected and works reliably — this
// only affects the first field that opens the keyboard from a closed state.
//
// Screens that host this hook (e.g. NewEstablishmentModal) also resize
// around the keyboard live, off the same native-driven animation that
// KeyboardProvider exposes (see useReanimatedKeyboardAnimation there). Core
// RN's `Keyboard` only exposes `keyboardDidShow`, which fires once that
// resize animation has already finished, so waiting for it before scrolling
// (previously: keyboardDidShow + a flat 250ms) meant the resize completed,
// then the view sat idle, then the scroll animated on top of an
// already-settled layout — visible as the modal "sticking" and then jumping
// again. `KeyboardEvents.addListener('keyboardWillShow', ...)`, from
// react-native-keyboard-controller (already a dependency for the resize
// above), fires cross-platform at the *start* of that same animation, so
// starting the scroll there lets both motions run concurrently instead of
// back to back.
export function useScrollToInput(scrollRef: React.RefObject<ScrollView | null>) {
  return useCallback((fieldRef: React.RefObject<TextInput | null>) => {
    if (!scrollRef.current || !fieldRef.current) return;

    if (Keyboard.isVisible()) {
      performScroll(scrollRef, fieldRef);
    } else {
      const sub = KeyboardEvents.addListener('keyboardWillShow', () => {
        sub.remove();
        performScroll(scrollRef, fieldRef);
      });
    }
  }, [scrollRef]);
}
