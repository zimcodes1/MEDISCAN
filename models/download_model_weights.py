import os
import torch
import torchxrayvision as xrv
from transformers import AutoImageProcessor, AutoModelForImageClassification

# 1. Create the directories to hold the models
os.makedirs("models/tb_classifier", exist_ok=True)

# 2. Download and save the TorchXRayVision model (.pt)
print("Downloading TorchXRayVision DenseNet121...")
xrv_model = xrv.models.DenseNet(weights="densenet121-res224-all")
# Saving the entire PyTorch model locally
torch.save(xrv_model, "models/densenet121_xrv.pt")
print(" Saved XRV to: models/densenet121_xrv.pt")

# 3. Download and save the Hugging Face MobileViT (.safetensors)
print("\nDownloading Hugging Face MobileViT (TB Model)...")
model_id = "Jesteban247/mobilevit_small-chest_xray"

# Fetch the model and its preprocessor
processor = AutoImageProcessor.from_pretrained(model_id)
model = AutoModelForImageClassification.from_pretrained(model_id)

# save_pretrained automatically saves the model.safetensors and config.json
processor.save_pretrained("models/tb_classifier")
model.save_pretrained("models/tb_classifier")
print(" Saved TB Classifier to: models/tb_classifier/model.safetensors")

print("\n Download complete! .")