import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * Tracks the on-screen keyboard height in px (0 when hidden).
 *
 * Use this for bottom-sheet <Modal>s: `KeyboardAvoidingView` is unreliable
 * inside a Modal on Android — under edge-to-edge the modal window doesn't
 * resize, so the keyboard covers the sheet's inputs and buttons. Applying the
 * returned height as bottom padding on a `justifyContent: "flex-end"` backdrop
 * lifts the whole sheet above the keyboard on both platforms.
 */
export function useKeyboardHeight(): number {
    const [height, setHeight] = useState(0);

    useEffect(() => {
        // iOS emits the "will" events (smoother); Android only the "did" events.
        const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
        const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

        const showSub = Keyboard.addListener(showEvent, (e) => {
            setHeight(e.endCoordinates?.height ?? 0);
        });
        const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0));

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    return height;
}
