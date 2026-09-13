---
id: on_learning_and_finding_the_right_information_to_learn_from
title: On Learning and finding the right information to learn from
formula: learning -> context -> capability
type: articulation
status: published
label: articulation
parent: root
depth: 1
domain: learning
excerpt: >-
  One of the problems I face when learning to program is finding the right
  information to base my understanding on. Not a tutorial, not a course, not
  some "learn to program in X days" book. I needed resources that would meet me
  where I was, contextualize what I was looking for against the greater picture,
  and — most importantly — avoid premature disclosure. Because premature
  disclosure defeats the whole purpose.
tags:
  - learning
  - documentation
  - programming
  - capability
children: []
connects: []
---

Even when you go looking for the knowledge of the people who came before you, an AI shows up first and collapses the pattern-matching that was supposed to happen in your own head for understanding to form. If you never needed the "how," maybe that doesn't matter to you. If you're anything like me, it's a genuinely difficult situation to sit inside.

I'll grant the argument: AI has made learning easier and more personalized, pulling information dynamically into whatever context the learner is in. I was never against that. Like everyone else, I was just still adapting to the new world.

But one thing was clear to me. I wanted to acquire capability. And I wanted to do it in the most optimal way possible — without floating on a sea of abstractions I didn't actually understand.

There were a lot of options. YouTube playlists, courses, books, articles, AI itself. But I kept finding the same thing: these mediums were built to familiarize you with an idea, not to transfer knowledge. Maybe that was just me. I never found truth in any of them.

So I sat with the question of how it used to be done. Before any of the modern affordances, people had already learned to program and build the immaculate systems the whole modern paradigm still rests on. How do I do that — become like them, in my own small way? It became obvious, after enough asking: the only true way was to actually figure it out yourself.

Those people had no one teaching them online. No YouTube courses. No stacks of cheap books. The one thing everyone had was the man pages. The documentation.

That became my answer.

I knew it wouldn't be easy. But I had to do it if I was ever going to become as capable as I wanted to be. Whatever suffering came with it would be justified by the understanding waiting on the other side — and more than that, I'd have done myself real good becoming someone capable of taking that turn at all.

I still used the modern tools alongside it. AI was useful for taking a wall of text and breaking it into something I could hold, helping me see the context an idea was coming from — because most of the time, documentation assumes you already know things you don't. Sometimes that gap was small, just unfamiliar wording around an easy idea. Other times it was a wall I couldn't get through even with AI's help.

That never stopped me. It just meant there was more work in front of me, and I never stopped doing it.

As time went on, the journey got easier. Now I can find what I need inside messy documentation and put it in context for myself, without needing AI to translate it for me.

Somewhere in there it became clear: human psychology doesn't cheat. You can only cosplay an outcome you didn't do the work for. It won't stick, because it has no reason to — it knows you never treated it as something that mattered. If you had, you'd have done whatever it took to drill it into the most fundamental part of yourself.

The deeper I got into documentation, the more I realized the translation work is bigger than I'd assumed. It takes real skill — prompting an AI, negotiating with it — to stop it from compressing the very thing that was supposed to be your medium for learning in the first place.

Around this time I came across a podcast that had John Crickett on. He talked about what it actually takes to become a better software engineer, and it came down to one thing: get good enough at fundamentals that you're language- and framework-agnostic. Build high-level applications from scratch. Master the act of building itself.

That gave me the shape of what I needed to do. Take my own projects, and use AI to translate the work into broken-down stages — in the same register as Crickett's coding challenges. Not to skip the struggle. To scaffold it.

I've since tested that theory on an actual project — building an HTTP server in Go from raw TCP up, stage by stage, treating the RFC as ground truth instead of a tutorial's version of one.

The first thing I had to unlearn was what the wall actually was. I used to think the gap between me and someone who could just read a spec was experience — years of accumulated context I hadn't earned yet. It wasn't. It was a notation. RFCs are written in a grammar called ABNF, and nobody is born knowing how to read it. It's a few hours of syntax, not a career. Once I saw that, the spec stopped being an oracle written for people above me and became what it actually is: the written record of a fight that implementers already had and settled, so every future implementer could agree on the same behavior without re-litigating it. It's dense because the density was for them, not because it forgot I existed.

That reframe changed how I read everything after it. A tutorial hands you someone else's decomposition of a problem, pre-chewed. A spec hands you the settled dispute itself, and the decomposition is your job. That's the actual difference, and it's the same difference between being handed a fish and being handed the fact that fish exist in this river.

The place I'd gotten stuck the first time I tried this project — a working TCP connection, but only hardcoded requests and hardcoded responses — turned out not to be a beginner's stall at all. It was the exact seam between the transport layer, where the operating system does the work for you, and the application layer, where you become the one responsible for meaning. Once I could name the seam, the stuckness stopped feeling like a personal failure and started feeling like the actual edge of the work.

The clearest proof the method is working came in a small, almost embarrassing moment. I was validating an HTTP version string and reached for a string-contains check. It caught the obvious bad input, but let something like `HTTP/1.1garbage` through — I'd only checked for presence, not exact shape. When that got flagged, I didn't need to be handed the next fix. I already knew what to ask: what's the actual grammar this has to match, byte for byte? That question is the whole thing my first essay was reaching for, now running on its own, without me steering it.

I write tests only after I've attempted the logic myself first, from the spec, in my own words, before checking it against anything else. That ordering is the part that matters. A correction against your own guess teaches you exactly where your model broke. A correction against nothing just hands you a model to memorize. The first sticks. I know because I can feel the difference now, in a way I couldn't argue for before I'd lived it.

I still have fourteen more stages ahead of me on this one project — concurrency, failure injection, distributed rate limiting — and I already know some of them will make me want to skip the struggle and just ask. This is my evidence, in my own hand, that the cost of forming the attempt first isn't friction to engineer away. It's the mechanism itself.
