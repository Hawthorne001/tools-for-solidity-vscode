import { ExecaChildProcess } from 'execa';
import * as semver from 'semver';
import * as externalDeps from '../../external-dependencies.json';

// Wake version constraints
// Source: external-dependencies.json
export const WAKE_MIN_VERSION = externalDeps.dependencies.wake.versions.minimum;
export const WAKE_RECOMMENDED_VERSION = externalDeps.dependencies.wake.versions.recommended;
export const WAKE_MAX_VERSION = externalDeps.dependencies.wake.versions.maximum;

// Anvil version constraints
// Source: external-dependencies.json
export const ANVIL_MIN_VERSION = externalDeps.dependencies.anvil.versions.minimum;
export const ANVIL_RECOMMENDED_VERSION = externalDeps.dependencies.anvil.versions.recommended;
export const ANVIL_MAX_VERSION = externalDeps.dependencies.anvil.versions.maximum || undefined;

export enum VersionStatus {
    compatible = 'compatible',
    warning = 'warning',
    error = 'error',
    unknown = 'unknown'
}

/**
 * Check version status against min, recommended, and max version constraints using semver
 * @param version Current version string
 * @param minVersion Minimum required version
 * @param recommendedVersion Recommended version
 * @param maxVersion Maximum tested version (exclusive) - optional
 * @returns VersionStatus
 */
export function checkVersionStatus(
    version: string | undefined,
    minVersion: string,
    recommendedVersion: string,
    maxVersion?: string
): VersionStatus {
    if (!version) {
        return VersionStatus.unknown;
    }

    try {
        const cleanVersion = semver.coerce(version);
        if (!cleanVersion) {
            return VersionStatus.unknown;
        }

        // Error: version < minVersion
        if (!semver.satisfies(cleanVersion, `>=${minVersion}`)) {
            return VersionStatus.error;
        }

        // Warning: version >= maxVersion (untested major version) - only if maxVersion is defined
        if (maxVersion && semver.satisfies(cleanVersion, `>=${maxVersion}`)) {
            return VersionStatus.warning;
        }

        // Warning: minVersion <= version < recommendedVersion (outdated)
        if (semver.satisfies(cleanVersion, `>=${minVersion} <${recommendedVersion}`)) {
            return VersionStatus.warning;
        }

        // Compatible: recommendedVersion <= version (< maxVersion if defined)
        return VersionStatus.compatible;
    } catch (error) {
        return VersionStatus.unknown;
    }
}

export interface Installer {
    setup(): Promise<void>;

    startWake(port: number): ExecaChildProcess;
}
