import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);

export interface MeetingApp {
  name: string;
  processName: string;
  isRunning: boolean;
  windowTitle?: string;
}

export class ProcessDetector extends EventEmitter {
  private pollInterval: NodeJS.Timeout | null = null;
  private lastState: Map<string, boolean> = new Map();

  private readonly meetingApps: MeetingApp[] = [
    { name: 'Microsoft Teams', processName: 'Microsoft Teams', isRunning: false },
    { name: 'Zoom', processName: 'zoom.us', isRunning: false },
    { name: 'GoToMeeting', processName: 'GoToMeeting', isRunning: false },
    { name: 'Slack', processName: 'Slack', isRunning: false },
    { name: 'Google Meet', processName: 'Google Chrome', isRunning: false },
    { name: 'WebEx', processName: 'CiscoWebExStart', isRunning: false },
    { name: 'Discord', processName: 'Discord', isRunning: false }
  ];

  startMonitoring(intervalMs: number = 5000): void {
    if (this.pollInterval) {
      this.stopMonitoring();
    }

    // Initial check
    this.checkRunningApps();

    // Set up polling
    this.pollInterval = setInterval(() => {
      this.checkRunningApps();
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async checkRunningApps(): Promise<MeetingApp[]> {
    try {
      const { stdout } = await execAsync('ps aux');
      
      for (const app of this.meetingApps) {
        const wasRunning = this.lastState.get(app.name) || false;
        app.isRunning = stdout.includes(app.processName);

        // Emit events when app state changes
        if (app.isRunning && !wasRunning) {
          this.emit('appStarted', app);
          this.emit('stateChanged', this.getRunningApps());
        } else if (!app.isRunning && wasRunning) {
          this.emit('appStopped', app);
          this.emit('stateChanged', this.getRunningApps());
        }

        this.lastState.set(app.name, app.isRunning);
      }

      // Special handling for browser-based meetings
      await this.checkBrowserMeetings();

      return this.meetingApps.filter(app => app.isRunning);
    } catch (error) {
      console.error('Error checking running apps:', error);
      return [];
    }
  }

  private async checkBrowserMeetings(): Promise<void> {
    try {
      // Use AppleScript to get browser tab titles
      const script = `
        tell application "System Events"
          set browserList to {"Google Chrome", "Safari", "Microsoft Edge"}
          set meetingIndicators to {"meet.google.com", "teams.microsoft.com", "zoom.us", "appear.in", "whereby.com"}
          
          repeat with browserName in browserList
            if exists process browserName then
              tell application browserName
                set tabTitles to {}
                set windowCount to count windows
                repeat with w from 1 to windowCount
                  set tabCount to count tabs of window w
                  repeat with t from 1 to tabCount
                    set tabTitle to title of tab t of window w
                    set tabURL to URL of tab t of window w
                    repeat with indicator in meetingIndicators
                      if tabURL contains indicator then
                        return browserName & " - Meeting detected: " & indicator
                      end if
                    end repeat
                  end repeat
                end repeat
              end tell
            end if
          end repeat
        end tell
        return "No meeting detected"
      `;

      const { stdout } = await execAsync(`osascript -e '${script}'`);
      
      if (stdout.includes('Meeting detected')) {
        // Update the appropriate browser app status
        const browserApp = this.meetingApps.find(app => 
          stdout.toLowerCase().includes(app.name.toLowerCase())
        );
        if (browserApp) {
          browserApp.isRunning = true;
          browserApp.windowTitle = stdout.trim();
        }
      }
    } catch (error) {
      // AppleScript might fail due to permissions, ignore silently
    }
  }

  getRunningApps(): MeetingApp[] {
    return this.meetingApps.filter(app => app.isRunning);
  }

  isAnyMeetingAppRunning(): boolean {
    return this.meetingApps.some(app => app.isRunning);
  }

  async getActiveWindowTitle(): Promise<string | null> {
    try {
      const script = `
        tell application "System Events"
          set frontApp to name of first application process whose frontmost is true
          tell process frontApp
            set windowTitle to name of front window
          end tell
          return frontApp & " - " & windowTitle
        end tell
      `;

      const { stdout } = await execAsync(`osascript -e '${script}'`);
      return stdout.trim();
    } catch (error) {
      return null;
    }
  }

  async isMeetingActive(): Promise<boolean> {
    const windowTitle = await this.getActiveWindowTitle();
    if (!windowTitle) return false;

    const meetingIndicators = [
      'Meeting',
      'Call',
      'Conference',
      'Zoom Meeting',
      'Teams Meeting',
      'Google Meet',
      'WebEx',
      'GoToMeeting'
    ];

    return meetingIndicators.some(indicator => 
      windowTitle.toLowerCase().includes(indicator.toLowerCase())
    );
  }
}