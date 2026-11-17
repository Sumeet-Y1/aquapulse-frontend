interface JitsiMeetExternalAPIOptions {
  roomName: string;
  jwt?: string;
  parentNode: HTMLElement;
  width: string | number;
  height: string | number;
  userInfo: { displayName: string };
  configOverwrite?: Record<string, unknown>;
  interfaceConfigOverwrite?: Record<string, unknown>;
}

interface JitsiMeetExternalAPIInstance {
  addListener(event: string, listener: (event: { on: boolean }) => void): void;
  dispose(): void;
}

interface Window {
  JitsiMeetExternalAPI: new (domain: string, options: JitsiMeetExternalAPIOptions) => JitsiMeetExternalAPIInstance;
}
