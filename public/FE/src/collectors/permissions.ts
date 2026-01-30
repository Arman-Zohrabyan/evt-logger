export interface PermissionsInfo {
  camera?: string;
  microphone?: string;
  notifications?: string;
  clipboardRead?: string;
  clipboardWrite?: string;
  geolocation?: string;
}

export class PermissionsCollector {
  private permissionNames = [
    { key: 'camera', name: 'camera' },
    { key: 'microphone', name: 'microphone' },
    { key: 'notifications', name: 'notifications' },
    { key: 'clipboardRead', name: 'clipboard-read' },
    { key: 'clipboardWrite', name: 'clipboard-write' },
    { key: 'geolocation', name: 'geolocation' }
  ];

  async collect(): Promise<PermissionsInfo | null> {
    if (!navigator.permissions) return null;

    const result: Record<string, string> = {};

    for (const { key, name } of this.permissionNames) {
      try {
        const status = await navigator.permissions.query(
          { name } as PermissionDescriptor
        );
        result[key] = status.state;
      } catch {
        result[key] = 'unsupported';
      }
    }

    return result as PermissionsInfo;
  }
}
