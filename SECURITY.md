# Security Policy

## Supported versions

Security updates are provided for the latest released version on a best-effort basis.

## Reporting a vulnerability

Please do not report vulnerabilities in a public issue. Use GitHub's private vulnerability reporting feature on the repository's **Security** tab. If private reporting is unavailable, contact the maintainer through the contact method listed on the GitHub profile at <https://github.com/datfinesoul>.

Include a description of the issue, affected versions, reproduction steps, potential impact, and any suggested remediation. You should receive an acknowledgment within seven days. Please allow a reasonable amount of time for investigation and remediation before public disclosure.

## Security model

Pi extensions execute with the same operating-system permissions as Pi. Review extension source before installation and protect the package files from untrusted modification. The extension reads the current session transcript, parses fenced code blocks from assistant messages, and writes the selected blocks to the system clipboard. It reads no project configuration and has no project-trust-sensitive state. Copied text is placed on the clipboard verbatim; the picker strips terminal control sequences for display only. This extension is a convenience, not a sandbox, authorization control, or security boundary.
