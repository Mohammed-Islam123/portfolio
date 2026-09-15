---
title: "Notes from the Wire"
description: "Field notes from debugging hand-rolled binary protocols — what Wireshark can't see, and how to build the tools that can."
pubDate: 2025-09-20
tags: ["Protocols", "Networking", "Rust", "Backend"]
thumbnail: ./feature.svg
thumbnailAlt: "Notes from the Wire — feature illustration"
draft: false
---

When you control both ends of a wire, you do strange things. You invent
your own binary format. You compress headers that didn't need
compressing. You add a magic byte that's actually three bytes because
the original magic byte collided with a payload marker you added six
months later. The protocol grows organically, nobody documents it, and
one day you find yourself staring at a hex dump trying to remember
whether the length prefix is u32 BE or u32 LE.

This post is a collection of field notes from debugging these systems.
None of them are profound; all of them are things I had to learn the
hard way.

## Wireshark can't help you

Wireshark is the right tool for protocols it knows about — TCP, HTTP,
TLS, Postgres. The moment you have a custom protocol layered on top of
TCP, Wireshark sees a stream of bytes and gives up. You can write a
dissector in Lua, but that's a project, not a debugging session.

The practical alternative is a TCP proxy that prints every byte that
passes through it, in both directions, with timestamps. It doesn't need
to understand the protocol — it just needs to show you the bytes. You
do the understanding in your head, with the spec open in another
window.

Here's the minimal Rust version, ~30 lines:

```rust
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let listener = TcpListener::bind("127.0.0.1:9999").await?;
    loop {
        let (mut client, addr) = listener.accept().await?;
        let mut upstream = tokio::net::TcpStream::connect("127.0.0.1:8080").await?;
        let (mut cr, mut cw) = client.split();
        let (mut ur, mut uw) = upstream.split();
        let c2u = tokio::spawn(async move {
            let mut buf = [0u8; 4096];
            loop {
                let n = cr.read(&mut buf).await?;
                if n == 0 { break; }
                eprintln!("[{}] C→S {:<48}  {}", n, hex(&buf[..n]), ascii(&buf[..n]));
                uw.write_all(&buf[..n]).await?;
            }
            Ok::<_, std::io::Error>(())
        });
        let u2c = tokio::spawn(async move {
            let mut buf = [0u8; 4096];
            loop {
                let n = ur.read(&mut buf).await?;
                if n == 0 { break; }
                eprintln!("[{}] S→C {:<48}  {}", n, hex(&buf[..n]), ascii(&buf[..n]));
                cw.write_all(&buf[..n]).await?;
            }
            Ok::<_, std::io::Error>(())
        });
        let _ = (c2u.await, u2c.await);
    }
}

fn hex(b: &[u8]) -> String {
    b.iter().map(|x| format!("{:02x}", x)).collect::<Vec<_>>().join(" ")
}

fn ascii(b: &[u8]) -> String {
    b.iter().map(|&b| if (32..127).contains(&b) { b as char } else { '.' }).collect()
}
```

Drop it between your client and server. Watch the bytes flow. The bug
becomes obvious in about 30 seconds — usually a length prefix that's
off by one, or a payload that's missing a trailing newline.

## The protocol you designed six months ago

The protocol isn't documented because at the time you wrote it, it was
obvious. Six months later, it isn't. The version that's actually
running in production has three patches you forgot about, two fields
that are always zero but the spec says are "reserved," and one magic
byte that was changed to avoid a collision.

The lesson is: write the spec the day you write the protocol. Even if
it's a one-paragraph comment at the top of the file. Especially if it's
a one-paragraph comment at the top of the file. The spec doesn't have
to be formal; it has to be there when you come back to it.

## The framing problem

Most custom protocols start as: "send a length, then send the bytes."
This is fine until the bytes contain another length prefix, and you
realize you have a nested framing problem. The outer frame says 100
bytes; the inner frame says 80 bytes; what are the other 20 bytes?

The answer is usually "metadata we added later and forgot to document."
The fix is to make every frame self-describing — a magic byte, a
version, a type, a length, a payload. Yes, it's more bytes on the wire.
No, it's not worth optimizing. The cost of a 12-byte header instead of
a 4-byte header is negligible; the cost of an ambiguous protocol is a
week of debugging.

## The "it works on my machine" failure

The hardest bug class is the one that only reproduces on one machine.
The bytes look right. The logs look right. The other machine sends the
exact same payload and it works. What's different?

The answer is almost always endianness or alignment. A u32 read as
little-endian on a little-endian machine works fine. The same code
compiled for a big-endian target reads the bytes in the wrong order
and produces a completely different number. The protocol spec said
"big-endian," but nobody enforced it.

The fix is to never use native byte order in a wire protocol. Always
specify the byte order in the spec, and assert it in the code. In
Rust:

```rust
let len = u32::from_be_bytes(buf[..4].try_into()?);
```

The `from_be_bytes` is explicit — you can't accidentally read it as
little-endian. In C, this is harder; you need `htonl` and `ntohl`
religiously. In Go, `binary.BigEndian.Uint32` is explicit.

## Closing

Custom protocols are fun to design and painful to debug. The debugging
pain is almost always self-inflicted — a spec that wasn't written, a
byte order that wasn't specified, a length prefix that was off by one.
The tools to debug them are simple: a proxy that prints bytes, a spec
that's actually written down, and the discipline to make every frame
self-describing.

The next time you find yourself debugging a protocol at 2am, remember:
the bytes don't lie. The spec might. The code might. The bytes never do.
