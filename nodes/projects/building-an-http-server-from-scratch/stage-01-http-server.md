---
id: stage_01_http_server
title: Stage 01 HTTP Server
formula: receive -> parse -> answer
type: projects
folder: false
status: published
label: stage 01
parent: building_an_http_server_from_scratch
depth: 2
domain: systems
excerpt: "The first stage is to make something exist: a small Go server that can receive an HTTP request and answer it."
tags:
  - project
  - go
  - http
  - stage-01
  - learning
children: []
connects: []
---

## Phase I — Make Something Exist

### 1. HTTP Server — "I can receive and answer."

You start with the smallest useful server possible, using Go's standard networking primitives.

You establish the fundamental chain:

```
client
  ↓
network
  ↓
socket
  ↓
TCP connection
  ↓
HTTP request
  ↓
your program
  ↓
HTTP response
  ↓
client
```

You aren't trying to build a "good" server yet.

You're trying to understand:

- what a process is
- what a port is
- what listening means
- what a connection is
- what bytes are
- what an HTTP request actually looks like
- how your program receives and responds to it

**Capability gained:**

> I can create a network service and understand its basic path through the machine.

---

To do this, you first have to build a program that listens for incoming requests in a loop and sends responses back. That, automatically, is the server.

You create a program that listens for TCP connections on a specified port, accepts connections made to that socket, handles each one, and sends a response back to the caller. You do the handling of the connection yourself.

#### Handling the connection

When you accept the connection, you get back either an error or a network stream. Go lets you handle both. The network stream exposes three functions you can use on it: read, write, and close — which means the network stream is, in Go, an interface.

The network stream represents one specific, already-established connection to one specific client. In the real world we handle more than one connection at a time, so we have to handle connections concurrently. If we don't, our accept call will block every new connection until we're done with the first one — when in reality, we could always be handling more, using concurrency. Each connection stream is a private, two-way pipe to exactly one client, already through the TCP handshake, ready to read and write immediately.

It's a stream. Not a message.

> It's a stream, not a message. This is the part that trips people up first. TCP doesn't preserve "boundaries" — if the client sends 100 bytes in one write and then 50 more, your `Read()` calls might return them as 100+50, or 30+70+50, or any other split. TCP guarantees order and completeness, not chunking. That's exactly why HTTP parsing can't just be "call Read once and you have the request" — you often need to read repeatedly, buffering as you go, until you've accumulated a full request (request line, then headers up to the blank line, then exactly `Content-Length` bytes of body if any). This is what "raw bytes" concretely means for you: you own reconstructing meaning out of an unstructured, possibly-fragmented stream.
>
> — Claude

TCP doesn't know messages. It knows only bytes. So we have to build the parser that turns those bytes into meaning, accounting for every issue that could come up in the process — like the 100+50 vs. 30+70+50 split from the elaboration above. The reason is, again, that the connection is a stream with no boundaries. There's only the connection, and whatever is written through it is guaranteed only to be ordered and complete. So every read has to account for what each write actually is — decoding it — and where each write begins and ends. A write to the connection stream, once it's been decoded, can be called a message. While it's still in transit and undecoded, it's just pure bytes.

#### What shape does a byte take?

When a byte stream is decoded, there's a specific shape it has to take to be deemed a complete message. This format is specified by the RFC:

> **2.1. Message Format**
>
> An HTTP/1.1 message consists of a start-line, followed by a CRLF, and a sequence of octets in a format similar to the Internet Message Format: zero or more header field lines (collectively referred to as the "headers" or the "header section"), an empty line indicating the end of the header section, and an optional message body.
>
> ```
> HTTP-message   = start-line CRLF
> *( field-line CRLF )
> CRLF
> [ message-body ]
> ```
>
> A message can be either a request from client to server or a response from server to client. Syntactically, the two types of messages differ only in the start-line, which is either a request-line (for requests) or a status-line (for responses), and in the algorithm for determining the length of the message body.
>
> ```
> start-line     = request-line / status-line
> ```
>
> In theory, a client could receive requests and a server could receive responses, distinguishing them by their different start-line formats. In practice, servers are implemented to only expect a request (a response is interpreted as an unknown or invalid request method), and clients are implemented to only expect a response.

## Parsing a Byte — the HTTP Way

- Read the start line (the request-line, in the context of servers) into a structure.
- Read each header field line into a hash table by field name, until the empty line.
- Use the parsed data to determine whether a message body is expected. If one is indicated, it's read as a stream until an amount of octets equal to the message body length has been read, or the connection is closed.

#### Request lines

A request line — implemented by clients, expected and parsed by servers — begins with a method token, followed by a single space (SP), the request target, another single space, and ends with the protocol version:

```
request-line   = method SP request-target SP HTTP-version
```

Notes from the RFC on parsing the request line:

> Although the request-line grammar rule requires that each of the component elements be separated by a single SP octet, recipients MAY instead parse on whitespace-delimited word boundaries and, aside from the CRLF terminator, treat any form of whitespace as the SP separator while ignoring preceding or trailing whitespace.
>
> However, lenient parsing can result in request smuggling security vulnerabilities if there are multiple recipients of the message and each has its own unique interpretation of robustness.

Notes on handling unimplemented requests:

> HTTP does not place a predefined limit on the length of a request-line. A server that receives a method longer than any that it implements SHOULD respond with a 501 (Not Implemented) status code. A server that receives a request-target longer than any URI it wishes to parse MUST respond with a 414 (URI Too Long) status code.
>
> Various ad hoc limitations on request-line length are found in practice. It is RECOMMENDED that all HTTP senders and recipients support, at a minimum, request-line lengths of 8000 octets.

#### Message body

> The message body (if any) of an HTTP/1.1 message is used to carry content for the request or response. The message body is identical to the content unless a transfer coding has been applied.
>
> ```
> message-body = *OCTET
> ```
>
> The rules for determining when a message body is present in an HTTP/1.1 message differ for requests and responses.
>
> The presence of a message body in a request is signaled by a Content-Length or Transfer-Encoding header field. Request message framing is independent of method semantics.
>
> The presence of a message body in a response depends on both the request method it's responding to and the response status code. This corresponds to when response content is allowed by HTTP semantics.

#### bufio.Reader

This is the key tool, in Go, that helps us read pure bytes and identify lines out of them. It has its own methods we can use on a byte stream — one of them, `ReadString(delim byte) (string, error)`, blocks and keeps reading from the connection until it sees the delimiter you asked for, then hands back everything up to and including it. Our delimiter, in this case, is `\n` — a newline.

### parseRequestLine

Once we've identified a line from the connection stream, we build a function that takes that line as a string and splits it into method, request-target, and HTTP-version.

### Implementing the parser

There's a difference between implementing — and building in general — from a tutorial versus from an actual specification. I've done both, and I see now why a spec is what it is: the actual specification. I have to make sure the parser covers all the edge cases, most of which would've been quietly ignored had I followed a tutorial or course instead.

### End to end

Closed the loop. Added a hardcoded response in `handleConnection`:

```
response := "HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nOK"
_, err = conn.Write([]byte(response))
if err != nil {
    return err
}
```

Hit it with `curl -v`, and got the full response back — headers and body. Stage 1's capability is real now, not just parsed on paper: receive, and answer.

The implementation is recorded in the [Stage 01 commit](https://github.com/breexzed/http-server/commit/db52379f5f2ddc2c867d9bce915a0e97b01d697c).
