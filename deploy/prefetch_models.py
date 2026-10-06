"""Runs at image build time: download model weights into the image."""
import os

import torchxrayvision as xrv

print("Downloading DenseNet121 (densenet121-res224-all)...")
xrv.models.DenseNet(weights="densenet121-res224-all")

repo = os.environ.get("TB_MODEL_ID", "").strip()
if repo:
    from huggingface_hub import snapshot_download

    revision = os.environ.get("TB_MODEL_REVISION", "").strip() or None
    print(f"Downloading TB model {repo} (revision {revision or 'latest'})...")
    snapshot_download(repo, revision=revision, allow_patterns=["*.json", "*.safetensors", "*.txt"])
else:
    print("TB_MODEL_ID not set at build time: skipping TB model download.")
print("Done.")
