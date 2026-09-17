import { Alert, Linking } from 'react-native';
import { showUpdateRequiredAlert } from './updateRequiredAlert';
import { LATEST_APK_URL } from './checkForUpdate';

describe('showUpdateRequiredAlert', () => {
  it('names the minimum version and offers the stable APK download beside dismiss', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    showUpdateRequiredAlert('1.2.0', 'Nothing was changed.');

    expect(alert).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = alert.mock.calls[0] as [string, string, { text: string; onPress?: () => void }[]];
    expect(title).toBe('Update required');
    expect(message).toContain('at least version 1.2.0');
    expect(message).toContain('Nothing was changed.');
    expect(buttons.map(b => b.text)).toEqual(['Later', 'Download']);
    buttons[1].onPress?.();
    expect(open).toHaveBeenCalledWith(LATEST_APK_URL);

    alert.mockRestore();
    open.mockRestore();
  });
});
