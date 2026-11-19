#the dataset class
train_dataset = ISNetPneumoniaDataset(train_pairs, mask_mapping, train=True)
val_dataset = ISNetPneumoniaDataset(val_pairs, mask_mapping, train=False)
test_dataset = ISNetPneumoniaDataset(test_pairs, mask_mapping, train=False)

batch_size = 8  # Reduced batch size to mitigate CUDA OOM during LRP-heavy forward passes

train_loader = DataLoader(train_dataset, batch_size=16, shuffle=True, num_workers=2)
val_loader = DataLoader(val_dataset, batch_size=16, shuffle=False, num_workers=2)
test_loader = DataLoader(test_dataset, batch_size=16, shuffle=False, num_workers=2)

# sanity check one batch
batch_images, batch_masks, batch_labels = next(iter(train_loader))
print(batch_images.shape, batch_masks.shape, batch_labels.shape)
train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0)
val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=0)
test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=0)

# i had to reduce the batch size because i was getting a torch.OutOfMemoryError but i still could not fix it .



# === Step 2: Instantiate ISNet Lightning model ===
try:
    import inspect
    import ISNetLightningZe
    import ISNetFlexLightning
    import LRPDenseNetZe
    import pytorch_lightning as pl
    print("Imported ISNet modules.")
except Exception as e:
    print("Failed to import ISNet modules:", e)

# Find candidate LightningModule classes in the imported modules
candidates = []
for mod in (ISNetLightningZe, ISNetFlexLightning):
    for name in dir(mod):
        try:
            obj = getattr(mod, name)
            if inspect.isclass(obj) and issubclass(obj, pl.LightningModule):
                candidates.append((mod.__name__, name, obj))
        except Exception:
            continue

print("Candidate Lightning classes found:", [f"{m}.{n}" for m,n,_ in candidates])

ModelClass = None
if candidates:
    # prefer a class with 'ISNet' or 'ISNetLightning' in the name
    for m, n, cls in candidates:
        if 'ISNet' in n or 'ISNetLightning' in n:
            ModelClass = cls
            break
    if ModelClass is None:
        ModelClass = candidates[0][2]

    sig = inspect.signature(ModelClass.__init__)
    print("Constructor signature:", sig)

    # Provided constructor args (as confirmed)
    requested_kwargs = dict(
        classes=1,
        architecture='densenet121',
        A=1,
        B=3,
        momentum=0.99,
        optim='SGD',
        pretrained=True,
    )

    # Filter to supported args
    filtered_kwargs = {k: v for k, v in requested_kwargs.items() if k in sig.parameters}
    print("Passing kwargs:", filtered_kwargs)

    try:
        # Enforce deterministic CuDNN mode as required by this ISNet implementation
        import torch as _torch
        _torch.backends.cudnn.deterministic = True
        _torch.backends.cudnn.benchmark = False

        # Retry instantiation — do NOT call model.to(device) when using Lightning Trainer.
        # Let the Trainer handle device placement to avoid CPU/GPU tensor mismatches.
        model = ModelClass(**filtered_kwargs)
        total_params = sum(p.numel() for p in model.parameters())
        trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
        print(f"Instantiated {ModelClass.__name__} — params total={total_params:,}, trainable={trainable:,}")
        # Some ISNet implementations set `cut`/`cut2` as ints rather than mappings.
        # The training code expects subscriptable objects (e.g., dict/list) indexed by keys.
        # Normalize integer `cut`/`cut2` to a defaultdict that returns the same int for any key.
        try:
            from collections import defaultdict
            for _attr in ('cut', 'cut2'):
                if hasattr(model, _attr):
                    _v = getattr(model, _attr)
                    if isinstance(_v, int):
                        setattr(model, _attr, defaultdict(lambda v=_v: v))
                        print(f"Normalized model.{_attr} from int {_v} to a default-mapping returning {_v} for any key.")
        except Exception as _e:
            print('Warning: failed to normalize model.cut/cut2:', _e)

        # Disable LRP/heat during training to greatly reduce memory usage.
        # LRP (heat) is expensive; leave it disabled for training sanity runs and
        # enable only for validation/analysis if needed.
        try:
            if hasattr(model, 'heat'):
                model.heat = False
                print('Disabled model.heat to avoid running LRP during training (reduces GPU memory).')
        except Exception as _e:
            print('Warning: failed to set model.heat:', _e)
    except Exception as e:
        print("Failed to instantiate model with filtered kwargs:", e)
        print("Attempting to instantiate with no kwargs to inspect defaults...")
        try:
            # ensure deterministic flags set before any further attempts
            import torch as _torch
            _torch.backends.cudnn.deterministic = True
            _torch.backends.cudnn.benchmark = False
            model = ModelClass()
            print("Instantiated with no args — signature may differ.\n", inspect.signature(ModelClass.__init__))
        except Exception as e2:
            print("Second instantiation attempt failed:", e2)
else:
    print("No LightningModule subclass candidates found in ISNet modules. Confirm imports and module paths.")

# Expose `model` in the notebook namespace if available
try:
    model  # noqa: F821
except NameError:
    model = None

print("Step 2 complete — model variable present:" , model is not None)


# === Step 3: Training hyperparameters and optimizer ===
# Set hyperparameters (match project checklist)
lr = 0.001
momentum = 0.99
weight_decay = 0
batch_size = 4  # Further reduced batch size to mitigate CUDA OOM
max_epochs = 48
grad_clip = 1.0

print(f"Hyperparams: lr={lr}, momentum={momentum}, weight_decay={weight_decay}, batch_size={batch_size}, max_epochs={max_epochs}, grad_clip={grad_clip}")

if 'model' not in globals() or model is None:
    print("Model not found in notebook namespace. Run the Step 2 cell to instantiate the model before creating optimizer.")
else:
    import torch
    try:
        optimizer = torch.optim.SGD(model.parameters(), lr=lr, momentum=momentum, weight_decay=weight_decay)
        print("Optimizer created:", type(optimizer).__name__)
    except Exception as e:
        print("Failed to create optimizer:", e)

# Optionally add a scheduler here (uncomment to enable)
# from torch.optim.lr_scheduler import StepLR
# scheduler = StepLR(optimizer, step_size=15, gamma=0.1)



# i made this cell to try to fix the memory errors but i have not gotten any success.
# === New Cell: Collate adapter to drop masks during training ===
# Minimal, non-invasive adapter: training loader yields (images, labels)
import torch
from torch.utils.data._utils.collate import default_collate

def collate_drop_masks(batch):
    imgs = torch.stack([item[0] for item in batch])
    labels = torch.stack([item[2] for item in batch])
    return imgs, labels

# Recreate loaders using the existing datasets (batch_size available in kernel)
try:
    bs = batch_size
except NameError:
    bs = 4

train_loader = DataLoader(train_dataset, batch_size=bs, shuffle=True, num_workers=0, collate_fn=collate_drop_masks)
val_loader   = DataLoader(val_dataset,   batch_size=bs, shuffle=False, num_workers=0, collate_fn=default_collate)
test_loader  = DataLoader(test_dataset,  batch_size=bs, shuffle=False, num_workers=0, collate_fn=default_collate)

# Sanity print
b = next(iter(train_loader))
print('Inserted collate: train batch types/shapes:', type(b), [getattr(x, 'shape', None) for x in b])

  
# this cell too is attempt at fixing the issue  it drops masks in train loader 
# === OOM Mitigation: memory-efficient backbone + batch_size=1 ===
# Non-invasive: don't change repo. Reinstantiate model using a memory-efficient DenseNet and reduce batch size.
import os, torch
from torch.utils.data._utils.collate import default_collate

print('GPU available:', torch.cuda.is_available())
# reduce fragmentation
os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'expandable_segments:True'
if torch.cuda.is_available():
    torch.cuda.empty_cache()

# Set tiny batch size to avoid OOM
old_bs = globals().get('batch_size', None)
batch_size = 1
print(f'Setting `batch_size` = {batch_size} (was {old_bs})')

# Attempt to build a memory-efficient DenseNet backbone and reinstantiate the LightningModule
try:
    classes = getattr(model, 'classes', None)
    if classes is None and 'filtered_kwargs' in globals():
        classes = filtered_kwargs.get('classes', 1)
    if classes is None:
        classes = 1

    print('Instantiating memory-efficient DenseNet base...')
    base = LRPDenseNetZe.densenet121(pretrained=False, memory_efficient=True, num_classes=classes)

    print('Reinstantiating LightningModule with baseModel=memory_efficient DenseNet...')
    if 'filtered_kwargs' in globals():
        new_model = ModelClass(baseModel=base, **filtered_kwargs)
    else:
        new_model = ModelClass(baseModel=base)

    # disable heat for training sanity runs
    try:
        if hasattr(new_model, 'heat'):
            new_model.heat = False
    except Exception:
        pass

    model = new_model
    print('Model reinstantiated successfully (memory_efficient=True).')
except Exception as e:
    print('Failed to reinstantiate memory-efficient model:', e)

# Recreate DataLoaders with small batch size; reuse collate_drop_masks if present
try:
    coll_fn = collate_drop_masks if 'collate_drop_masks' in globals() else default_collate
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0, collate_fn=coll_fn)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=0, collate_fn=default_collate)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=0, collate_fn=default_collate)
    print('Recreated loaders with batch_size=', batch_size)
    b = next(iter(train_loader))
    print('Sample train batch shapes:', [getattr(x, 'shape', None) for x in b])
except Exception as e:
    print('Failed to recreate loaders:', e)
    
    
    
# this is the trainer setup and a also added a 1-epoch sanity check so as to filter out any errors at runtime and i got TypeError message i'll add it after the two debug cells i used to figure out the issue.

    # === Step 4: Trainer setup and optional 1-epoch sanity check ===
import os
import torch
import pytorch_lightning as pl

use_gpu = torch.cuda.is_available()
dev_accel = 'gpu' if use_gpu else 'cpu'
devices = 1 if use_gpu else None

trainer = pl.Trainer(
    accelerator=dev_accel,
    devices=devices,
    max_epochs=1,  # sanity check run; change to `max_epochs=max_epochs` for full training
    gradient_clip_val=grad_clip,
    precision=16,  # use mixed precision to reduce GPU memory footprint
    amp_backend='native',
    num_sanity_val_steps=0,  # skip automatic sanity-check validation pass (saves memory)
    limit_val_batches=1,  # limit validation to 1 batch per epoch to reduce memory
)

print("Trainer instantiated:", trainer)

# Safety gate: run the sanity check once when enabled.
run_sanity_check = True

if 'model' not in globals() or model is None:
    print("Model not found — cannot run trainer. Instantiate model first and re-run this cell.")
elif run_sanity_check:
    print("Running 1-epoch sanity training (this may be slow)...")
    import traceback
try:
    # clear cached GPU memory before starting training
    try:
        # try to reduce fragmentation (suggested by PyTorch OOM message)
        os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'expandable_segments:True'
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except Exception:
        pass
    trainer.fit(model, train_loader, val_loader)
except Exception:
    traceback.print_exc()
    raise
else:
    print("Sanity run skipped. To execute, set `run_sanity_check = True` above and re-run this cell.")
    
    
    # these are the debug cells  and their outputs accordingly i accidentally cleared the output of the first debug cell.
    
    # === Debug: Inspect model training_step and test one batch through it ===
import inspect, traceback

if 'model' not in globals() or model is None:
    print('Model not available in namespace — run Step 2 cell first')
else:
    cls = model.__class__
    print('Model class:', cls.__module__ + '.' + cls.__name__)

    # show forward and training_step signatures
    for name in ('forward', 'training_step', 'validation_step'):
        if hasattr(model, name):
            try:
                fn = getattr(model, name)
                print(f"\n{name} signature:", inspect.signature(fn))
                try:
                    src = inspect.getsource(fn)
                    print(f"\n{name} source (first 2000 chars):\n", src[:2000])
                except Exception as e:
                    print(f"Could not get source for {name}:", e)
            except Exception as e:
                print('Error inspecting', name, e)

    # grab one batch and print structure
    try:
        batch = next(iter(train_loader))
    except Exception as e:
        print('Failed to get a batch from train_loader:', e)
        batch = None

    if batch is not None:
        print('\nBatch repr and types:')
        try:
            # If batch is a tuple/list, iterate
            if isinstance(batch, (list, tuple)):
                for i, el in enumerate(batch):
                    t = type(el)
                    print(f' element {i}: type={t}, repr={repr(el)[:200]}')
                    if hasattr(el, 'shape'):
                        print('  shape=', getattr(el, 'shape'))
            else:
                print(' batch single object repr:', repr(batch)[:500])
        except Exception as e:
            print('Error printing batch repr:', e)

        # Attempt to run training_step
        print('\nCalling model.training_step(batch, 0) to reproduce error...')
        try:
            out = model.training_step(batch, 0)
            print('training_step output repr:', repr(out)[:1000])
        except Exception as e:
            print('training_step raised:', repr(e))
            print(traceback.format_exc())

        # Try a few unpack patterns commonly expected: (images, labels), (images, masks, labels), (images, labels, masks)
        patterns = [
            ('images, labels', lambda b: (b[0], b[2]) if isinstance(b, (list,tuple)) and len(b)>=3 else None),
            ('images, masks, labels', lambda b: (b[0], b[1], b[2]) if isinstance(b, (list,tuple)) and len(b)>=3 else None),
            ('images, labels, masks', lambda b: (b[0], b[2], b[1]) if isinstance(b, (list,tuple)) and len(b)>=3 else None),
        ]
        for name, maker in patterns:
            prepared = maker(batch)
            if prepared is None:
                continue
            print(f"\nTrying pattern: {name}")
            try:
                out = model.training_step(prepared, 0)
                print('  success, output repr:', repr(out)[:500])
                break
            except Exception as e:
                print('  failed:', repr(e))
                print(traceback.format_exc())

    else:
        print('No batch to test.')

    
    
    # === Debug cell 2: reproduce validation failure and inspect `cut`/`cut2` ===
import torch, traceback

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print('Using device:', device)

# move model temporarily for this local test
_orig_device = None
try:
    _orig_device = next(model.parameters()).device
except Exception:
    _orig_device = None

try:
    model.to(device)
except Exception as e:
    print('Warning: failed to move model to device:', e)

# grab one validation batch
try:
    batch = next(iter(val_loader))
    batch = tuple(b.to(device) if isinstance(b, torch.Tensor) else b for b in batch)
    print('Batch shapes:', [getattr(b, 'shape', None) for b in batch])
except Exception as e:
    print('Failed to fetch or move batch:', e)
    batch = None

# print important model attributes that the failure originates from
print('model.cut type/value:', type(getattr(model, 'cut', None)), getattr(model, 'cut', None))
print('model.cut2 type/value:', type(getattr(model, 'cut2', None)), getattr(model, 'cut2', None))
print('model.A,B,d:', getattr(model, 'A', None), getattr(model, 'B', None), getattr(model, 'd', None))
print('model.tuneCut, model.heat, model.labelLogit, model.P:',
      getattr(model, 'tuneCut', None), getattr(model, 'heat', None), getattr(model, 'labelLogit', None), getattr(model, 'P', None))

# Try invoking validation_step to reproduce the error with full traceback
if batch is not None:
    try:
        print('\n-> calling model.validation_step(batch, 0, dataloader_idx=0)')
        out = model.validation_step(batch, 0, dataloader_idx=0)
        print('validation_step output:', out)
    except Exception:
        traceback.print_exc()

    # Try forward + compound_loss directly for more targeted trace
    try:
        print('\n-> calling forward then compound_loss directly')
        fw = model.forward(batch[0])
        print('forward returned type:', type(fw))
        if isinstance(fw, tuple):
            logits, heatmaps = fw[0], fw[1]
        else:
            logits, heatmaps = fw, None
        labels = batch[2] if len(batch) >= 3 else None
        masks = batch[1] if len(batch) >= 2 else None
        print('logits shape/type:', getattr(logits, 'shape', None), type(logits))
        print('labels shape/type:', getattr(labels, 'shape', None), type(labels))
        print('masks shape/type:', getattr(masks, 'shape', None), type(masks))
        try:
            loss = model.compound_loss(logits, labels=labels, heatmaps=heatmaps, masks=masks)
            print('compound_loss returned:', loss)
        except Exception:
            traceback.print_exc()
    except Exception:
        traceback.print_exc()

# restore original device if we moved the model
try:
    if _orig_device is not None:
        model.to(_orig_device)
except Exception:
    pass

#output

Using device: cuda
Batch shapes: [torch.Size([16, 3, 224, 224]), torch.Size([16, 224, 224]), torch.Size([16, 1])]
model.cut type/value: <class 'int'> 1
model.cut2 type/value: <class 'int'> 25
model.A,B,d: 1 3 0.996
model.tuneCut, model.heat, model.labelLogit, model.P: False True False 0.7

-> calling model.validation_step(batch, 0, dataloader_idx=0)
Traceback (most recent call last):
  File "/tmp/ipykernel_19144/4000108614.py", line 39, in <cell line: 0>
    out = model.validation_step(batch, 0, dataloader_idx=0)
  File "/content/drive/MyDrive/MediScan_AI/ISNet_repo/code/ISNetLightningZe.py", line 489, in validation_step
    cLoss,hLoss=self.compound_loss(logits,labels=labels,
                ~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^
                                   heatmaps=heatmaps,masks=masks)
                                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/content/drive/MyDrive/MediScan_AI/ISNet_repo/code/ISNetLightningZe.py", line 396, in compound_loss
    cut=self.cut[key],
        ~~~~~~~~^^^^^
TypeError: 'int' object is not subscriptable

-> calling forward then compound_loss directly
forward returned type: <class 'tuple'>
logits shape/type: torch.Size([16, 1]) <class 'torch.Tensor'>
labels shape/type: torch.Size([16, 1]) <class 'torch.Tensor'>
masks shape/type: torch.Size([16, 224, 224]) <class 'torch.Tensor'>
Traceback (most recent call last):
  File "/tmp/ipykernel_19144/4000108614.py", line 59, in <cell line: 0>
    loss = model.compound_loss(logits, labels=labels, heatmaps=heatmaps, masks=masks)
  File "/content/drive/MyDrive/MediScan_AI/ISNet_repo/code/ISNetLightningZe.py", line 396, in compound_loss
    cut=self.cut[key],
        ~~~~~~~~^^^^^
TypeError: 'int' object is not subscriptable




# this is the mitigation cell i tried out to fix the memory error and also it's output at the bottom
# === OOM Mitigation: memory-efficient backbone + batch_size=1 ===
# Non-invasive: don't change repo. Reinstantiate model using a memory-efficient DenseNet and reduce batch size.
import os, torch
from torch.utils.data._utils.collate import default_collate

print('GPU available:', torch.cuda.is_available())
# reduce fragmentation
os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'expandable_segments:True'
if torch.cuda.is_available():
    torch.cuda.empty_cache()

# Set tiny batch size to avoid OOM
old_bs = globals().get('batch_size', None)
batch_size = 1
print(f'Setting `batch_size` = {batch_size} (was {old_bs})')

# Attempt to build a memory-efficient DenseNet backbone and reinstantiate the LightningModule
try:
    classes = getattr(model, 'classes', None)
    if classes is None and 'filtered_kwargs' in globals():
        classes = filtered_kwargs.get('classes', 1)
    if classes is None:
        classes = 1

    print('Instantiating memory-efficient DenseNet base...')
    base = LRPDenseNetZe.densenet121(pretrained=False, memory_efficient=True, num_classes=classes)

    print('Reinstantiating LightningModule with baseModel=memory_efficient DenseNet...')
    if 'filtered_kwargs' in globals():
        new_model = ModelClass(baseModel=base, **filtered_kwargs)
    else:
        new_model = ModelClass(baseModel=base)

    # disable heat for training sanity runs
    try:
        if hasattr(new_model, 'heat'):
            new_model.heat = False
    except Exception:
        pass

    model = new_model
    print('Model reinstantiated successfully (memory_efficient=True).')
except Exception as e:
    print('Failed to reinstantiate memory-efficient model:', e)

# Recreate DataLoaders with small batch size; reuse collate_drop_masks if present
try:
    coll_fn = collate_drop_masks if 'collate_drop_masks' in globals() else default_collate
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0, collate_fn=coll_fn)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=0, collate_fn=default_collate)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=0, collate_fn=default_collate)
    print('Recreated loaders with batch_size=', batch_size)
    b = next(iter(train_loader))
    print('Sample train batch shapes:', [getattr(x, 'shape', None) for x in b])
except Exception as e:
    print('Failed to recreate loaders:', e)

#output

GPU available: True
Setting `batch_size` = 1 (was 4)
Instantiating memory-efficient DenseNet base...
Reinstantiating LightningModule with baseModel=memory_efficient DenseNet...
/usr/local/lib/python3.13/dist-packages/pytorch_lightning/utilities/parsing.py:261: UserWarning: Attribute 'baseModel' is an instance of `nn.Module` and is already saved during checkpointing. It is recommended to ignore them using `self.save_hyperparameters(ignore=['baseModel'])`.
  rank_zero_warn(
Failed to reinstantiate memory-efficient model: cannot access local variable 'classesBackup' where it is not associated with a value
Recreated loaders with batch_size= 1
Sample train batch shapes: [torch.Size([1, 3, 224, 224]), torch.Size([1, 1])]
