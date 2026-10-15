# Security Policy

## Supported versions

Only the `main` branch receives security fixes.

## Reporting a vulnerability

**Please do not open a public issue to report a vulnerability.**

Use GitHub's private reporting instead:
[Security → Report a vulnerability](https://github.com/gabrantoniette/image-recognation/security/advisories/new).

If possible, include:

- a description of the issue and its impact;
- steps to reproduce (browser, version, affected URL/file);
- a suggested fix, if you have one.

You should get an initial response within 7 days.

## Scope

This is a static project that runs entirely in the browser (no backend).
The YOLOv5n model and TensorFlow.js run locally in a Web Worker;
no images or user data are sent to any server.
