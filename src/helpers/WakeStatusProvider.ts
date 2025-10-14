import * as vscode from 'vscode';
import { LanguageClient, State } from 'vscode-languageclient/node';
import { Analytics } from '../Analytics';
import { restartWakeClient } from '../commands';
import {
    ANVIL_MAX_VERSION,
    ANVIL_MIN_VERSION,
    ANVIL_RECOMMENDED_VERSION,
    VersionStatus,
    WAKE_MAX_VERSION,
    WAKE_MIN_VERSION,
    WAKE_RECOMMENDED_VERSION
} from '../installers/installerInterface';

export class WakeStatusBarProvider {
    // private static instance: WakeStatusBarProvider;
    private _statusBarItem!: vscode.StatusBarItem;

    constructor(
        private client: LanguageClient,
        private analytics: Analytics
    ) {
        this._initializeStatusBar();
        this._initializeCommands();
        this.client.onDidChangeState((state) => {
            this._updateStatusBar();
        });
    }

    private _initializeCommands() {
        vscode.commands.registerCommand('Tools-for-Solidity.wake.restart_client', () => {
            restartWakeClient(this.client);
        });
    }

    private _initializeStatusBar() {
        this._statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this._updateStatusBar();
    }

    private _getCurrentInstallationMethodString(): string {
        const extensionConfig = vscode.workspace.getConfiguration('Tools-for-Solidity');
        const wakePort: number | undefined = extensionConfig.get('Wake.port', undefined);
        let pathToExecutable: string | null = extensionConfig.get<string | null>(
            'Wake.pathToExecutable',
            null
        );
        if (pathToExecutable?.trim()?.length === 0) {
            pathToExecutable = null;
        }
        const installationMethod: string = extensionConfig.get<string>(
            'Wake.installationMethod',
            'conda'
        );

        if (wakePort) {
            return `port ${wakePort}`;
        } else if (pathToExecutable !== null) {
            return `executable path (${pathToExecutable}`;
        } else {
            return installationMethod;
        }
    }

    private _getVersionStatusIcon(status: VersionStatus | undefined): string {
        switch (status) {
            case VersionStatus.compatible:
                return '✓';
            case VersionStatus.warning:
                return '⚠';
            case VersionStatus.error:
                return '⚠';
            default:
                return '';
        }
    }

    private _getVersionStatusMessage(
        status: VersionStatus | undefined,
        version: string,
        minVersion: string,
        recommendedVersion: string,
        maxVersion?: string
    ): string {
        if (!status || status === VersionStatus.unknown) {
            return '';
        }

        let recommendedVersionRangeString = `>=${recommendedVersion}`;
        if (maxVersion) {
            recommendedVersionRangeString += ` <${maxVersion}`;
        }

        switch (status) {
            case VersionStatus.error:
                return ` (incompatible, recommended ${recommendedVersionRangeString})`;
            case VersionStatus.warning:
                return ` (untested, recommended ${recommendedVersionRangeString})`;
            case VersionStatus.compatible:
                return '';
            default:
                return '';
        }
    }

    private _getMostSevereStatus(): VersionStatus {
        const wakeStatus = this.analytics.wakeVersionStatus || VersionStatus.unknown;
        const anvilStatus = this.analytics.anvilVersionStatus || VersionStatus.unknown;

        if (wakeStatus === VersionStatus.error || anvilStatus === VersionStatus.error) {
            return VersionStatus.error;
        }
        if (wakeStatus === VersionStatus.warning || anvilStatus === VersionStatus.warning) {
            return VersionStatus.warning;
        }
        return VersionStatus.compatible;
    }

    private _updateStatusBar() {
        this._statusBarItem.backgroundColor = undefined;
        this._statusBarItem.command = undefined;
        this._statusBarItem.show();
        const versionText = this.analytics.wakeVersion ? `${this.analytics.wakeVersion}` : '-';
        const installation = this._getCurrentInstallationMethodString();
        const installationText = installation ? `${installation}` : '-';
        const anvilVersionText = this.analytics.anvilVersion || '-';

        const wakeStatusIcon = this._getVersionStatusIcon(this.analytics.wakeVersionStatus);
        const anvilStatusIcon = this._getVersionStatusIcon(this.analytics.anvilVersionStatus);
        const wakeStatusMessage = this._getVersionStatusMessage(
            this.analytics.wakeVersionStatus,
            versionText,
            WAKE_MIN_VERSION,
            WAKE_RECOMMENDED_VERSION,
            WAKE_MAX_VERSION
        );
        const anvilStatusMessage = this._getVersionStatusMessage(
            this.analytics.anvilVersionStatus,
            anvilVersionText,
            ANVIL_MIN_VERSION,
            ANVIL_RECOMMENDED_VERSION,
            ANVIL_MAX_VERSION
        );

        const mostSevereStatus = this._getMostSevereStatus();

        switch (this.client.state) {
            case State.Running:
                // this._statusBarItem.hide()
                const runningIcon =
                    mostSevereStatus === VersionStatus.warning ? 'warning' : 'check-all';
                this._statusBarItem.text = `$(${runningIcon}) Wake v${versionText}`;
                this._statusBarItem.tooltip = new vscode.MarkdownString(
                    [
                        '*Wake LSP is running*',
                        '---',
                        `Wake Version: \`${versionText}\` ${wakeStatusIcon}${wakeStatusMessage}`,
                        `Wake Installation Method: \`${installationText}\``,
                        `Anvil Version: \`${anvilVersionText}\` ${anvilStatusIcon}${anvilStatusMessage}`
                    ].join('\n\n')
                );

                // Set background color based on severity
                if (mostSevereStatus === VersionStatus.error) {
                    this._statusBarItem.backgroundColor = new vscode.ThemeColor(
                        'statusBarItem.errorBackground'
                    );
                } else if (mostSevereStatus === VersionStatus.warning) {
                    // this._statusBarItem.backgroundColor = new vscode.ThemeColor(
                    //     'statusBarItem.warningBackground'
                    // );
                }
                break;
            case State.Stopped:
                this._statusBarItem.text = `$(refresh) Wake v${versionText}`;
                this._statusBarItem.tooltip = new vscode.MarkdownString(
                    [
                        '*Cannot connect to Wake LSP, which is required by Solidity (Wake)*',
                        '*Click to restart client*',
                        '---',
                        `Wake Version: \`${versionText}\` ${wakeStatusIcon}${wakeStatusMessage}`,
                        `Wake Installation Method: \`${installationText}\``,
                        `Anvil Version: \`${anvilVersionText}\` ${anvilStatusIcon}${anvilStatusMessage}`
                    ].join('\n\n')
                );
                this._statusBarItem.backgroundColor = new vscode.ThemeColor(
                    'statusBarItem.errorBackground'
                );
                this._statusBarItem.command = 'Tools-for-Solidity.wake.restart_client';
                break;
            case State.Starting:
                this._statusBarItem.text = `$(sync~spin) Wake v${versionText}`;
                this._statusBarItem.tooltip = new vscode.MarkdownString(
                    [
                        '*Connecting to Wake LSP...*',
                        '---',
                        `Wake Version: \`${versionText}\` ${wakeStatusIcon}${wakeStatusMessage}`,
                        `Wake Installation Method: \`${installationText}\``,
                        `Anvil Version: \`${anvilVersionText}\` ${anvilStatusIcon}${anvilStatusMessage}`
                    ].join('\n\n')
                );

                // Set background color based on severity (even while starting)
                if (mostSevereStatus === VersionStatus.error) {
                    this._statusBarItem.backgroundColor = new vscode.ThemeColor(
                        'statusBarItem.errorBackground'
                    );
                } else if (mostSevereStatus === VersionStatus.warning) {
                    // this._statusBarItem.backgroundColor = new vscode.ThemeColor(
                    //     'statusBarItem.warningBackground'
                    // );
                }
                break;
            default:
                this._statusBarItem.hide();
                break;
        }
    }
}
