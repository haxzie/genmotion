# Workbench sandbox for the AI chat's `workbench` tool.
# Extends the E2B code-interpreter base (keeps runCode/Jupyter for `python`)
# and adds ffmpeg/ffprobe + an audio/video/image Python toolchain.
#
# Build & publish with the e2b CLI (see ./README.md), then set
# E2B_WORKBENCH_TEMPLATE=<template name> on the API process.
FROM e2bdev/code-interpreter:latest

USER root

# CLI media tools (ffmpeg ships ffprobe). imagemagick + libsndfile for images/audio.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     ffmpeg imagemagick libsndfile1 \
  && rm -rf /var/lib/apt/lists/*

# Audio / video / image Python packages (ffmpeg-backed where relevant).
RUN pip install --no-cache-dir \
      moviepy \
      pydub \
      imageio \
      imageio-ffmpeg \
      soundfile \
      librosa \
      opencv-python-headless \
      pillow \
      numpy \
      scipy \
      matplotlib \
      mutagen

# Quick sanity check at build time.
RUN ffmpeg -version >/dev/null && ffprobe -version >/dev/null \
  && python -c "import moviepy, pydub, imageio, soundfile, librosa, cv2, PIL, numpy, scipy, matplotlib, mutagen; print('workbench media deps OK')"
