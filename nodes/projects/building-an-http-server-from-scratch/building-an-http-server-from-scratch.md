---
id: building_an_http_server_from_scratch
title: Building An HTTP Server From Scratch
formula: documentation -> implementation -> capability
type: projects
folder: true
status: published
label: project
parent: root
depth: 1
domain: systems
visual: ./building-an-http-server-from-scratch-visual.svg
excerpt: "[httpd-go on GitHub](https://github.com/breexzed/httpd-go)"
tags:
  - project
  - go
  - http
  - learning
  - systems
children:
  - stage_01_http_server
connects: []
---

I attempted building an HTTP server once before, as part of the [Backend from First Principles: Complete Series](https://backend-from-first-principle.vercel.app/) track. I got stuck shortly after establishing a TCP connection and sending requests to it — hardcoded request, hardcoded response. Those early stages live in that project's git commit logs.

The first attempt lives in [http-from-scratch on GitHub](https://github.com/breexzed/http-from-scratch).

Later I came across the insights from *On Learning, Finding Projects, and Building Towards a Mind of Gold*, and I have a much clearer picture now of how I want to approach building this. I'm still unclear on a lot of the implementation details, but I plan to use this exact medium — this log — to break through them. I know I can do it. I will overcome every block.

## Project Overview

I read an intern's article on rate limiting at incident.io, as part of the protocols from *On Learning, Finding Projects, and Building Towards a Mind of Gold*. Here's the blog: [Rate limiting for beginners](https://dev.to/vivekalhat/rate-limiting-for-beginners-what-it-is-and-how-to-build-one-in-go-955).

I took it to ChatGPT and used some of the prompts from the protocol I'd followed. The infographic above is the result of that session.

### The why, what, and how (task, tool, scope)

I'd already been attempting to build an HTTP server. Then I found the rate-limiting blog, and I wanted to build one at a scale I could actually manage. So I decided — why not use the HTTP server as the base and scale toward the rate limiter, since they sit in the same field? ChatGPT helped me concretize that instinct and gave me the roadmap (and the infographic above) to build:

> A small HTTP server in Go that starts as a bare process accepting requests, and gradually evolves into a measurable, resilient, concurrent, performance-tested piece of infrastructure.

| Stage | Move | Capability |
| --- | --- | --- |
| 1 | BUILD | HTTP server |
| 2 | OBSERVE | Logging |
| 3 | REMEMBER | Request counter |
| 4 | CONTROL | Rate limiter |
| 5 | MODEL ENTITIES | Per-client state |
| 6 | COMPOSE | Concurrent clients |
| 7 | HANDLE CONCURRENCY | Timeouts |
| 8 | BOUND TIME | Connection limits |
| 9 | CONTROL LIFECYCLE | Graceful shutdown |
| 10 | MEASURE | Metrics |
| 11 | STRESS | Load testing |
| 12 | BREAK | Failure injection |
| 13 | COMPARE | Benchmarking |
| 14 | DIAGNOSE | Profiling |
| 15 | DISTRIBUTE | Distributed rate limiting |

This folder is where I document the process of my learning — the struggles, the concepts I come across, the insights, and what changes in me as I keep crossing the boundary of my own understanding. Using documentation, experiments, deliberate information collection, and agents primarily as research, debugging, and critique instruments.

I wish myself good luck.
