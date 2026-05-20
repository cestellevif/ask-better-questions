import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';
import {ReportModal} from '../../src/components/ReportModal';

jest.mock('../../src/config', () => ({
  BASE_URL: 'https://example.com',
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ReportModal', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({ok: true});
  });

  function renderModal(visible = true) {
    return render(<ReportModal visible={visible} onClose={onClose} />);
  }

  it('shows the form with all reason options', () => {
    const {getByText} = renderModal();
    expect(getByText('Report a problem')).toBeTruthy();
    expect(getByText('Inappropriate content')).toBeTruthy();
    expect(getByText('Inaccurate or misleading')).toBeTruthy();
    expect(getByText('Harmful or offensive')).toBeTruthy();
    expect(getByText('Something else')).toBeTruthy();
  });

  it('Send button is disabled before selecting a reason', () => {
    const {getByLabelText} = renderModal();
    const sendBtn = getByLabelText('Select a reason first');
    expect(sendBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('selecting a reason enables the Send button', () => {
    const {getByText, getByLabelText} = renderModal();
    fireEvent.press(getByText('Inaccurate or misleading'));
    const sendBtn = getByLabelText('Send report');
    expect(sendBtn.props.accessibilityState?.disabled).toBe(false);
  });

  it('pressing Send calls fetch with the selected reason', async () => {
    const {getByText, getByLabelText} = renderModal();
    fireEvent.press(getByText('Inaccurate or misleading'));
    fireEvent.press(getByLabelText('Send report'));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/report'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({reason: 'inaccurate'}),
        }),
      );
    });
  });

  it('shows success state after a successful send', async () => {
    const {getByText, getByLabelText} = renderModal();
    fireEvent.press(getByText('Inappropriate content'));
    fireEvent.press(getByLabelText('Send report'));
    await waitFor(() => {
      expect(getByText('Thanks for the report')).toBeTruthy();
    });
  });

  it('shows error state when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const {getByText, getByLabelText} = renderModal();
    fireEvent.press(getByText('Harmful or offensive'));
    fireEvent.press(getByLabelText('Send report'));
    await waitFor(() => {
      expect(getByText("Couldn't send report")).toBeTruthy();
    });
  });

  it('Cancel calls onClose', () => {
    const {getByText} = renderModal();
    fireEvent.press(getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Done button in success state calls onClose', async () => {
    const {getByText, getByLabelText} = renderModal();
    fireEvent.press(getByText('Inappropriate content'));
    fireEvent.press(getByLabelText('Send report'));
    await waitFor(() => getByText('Done'));
    fireEvent.press(getByText('Done'));
    expect(onClose).toHaveBeenCalled();
  });
});
