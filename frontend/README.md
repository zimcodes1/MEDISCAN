# 🩺 MediScan NG
## AI-Assisted Medical Imaging Diagnostic Support
### INTEGRATED DESIGN PROJECT BRIEF
k
---

## 1. Project Overview

MediScan NG is a web-based AI decision-support tool that allows medical staff to upload chest X-ray images and receive an automated analysis flagging possible pneumonia, supported by a visual heatmap overlay. The system is designed to assist — not replace — qualified radiologists and clinicians, particularly in settings where specialist availability is limited.

> **⚠️ Important Framing Requirement**  
> All outputs from MediScan NG must be labelled: *"Possible Findings — Review Required by a Qualified Clinician."* The system is a decision-support tool, not a diagnostic instrument. This framing is both ethically required and legally necessary.

### 1.1 Problem Statement

Nigeria has fewer than 500 qualified radiologists serving a population of over 220 million people. Many secondary and tertiary hospitals in states outside Lagos and Abuja have imaging equipment — X-ray machines, ultrasound scanners — but lack trained specialists to read and interpret results in a timely manner. This diagnostic gap leads to delayed treatment, especially for time-sensitive conditions like pneumonia, fractures, and early-stage tumours.

MediScan NG addresses this by providing an AI-powered preliminary screening layer, surfacing likely findings for a clinician to review and act on — dramatically reducing the time between scan and diagnosis.

### 1.2 Solution Summary

| Component         | Description                                                                 | Technology                         |
|-------------------|-----------------------------------------------------------------------------|------------------------------------|
| **AI Model**      | CNN fine-tuned on chest X-ray dataset to detect pneumonia signs             | PyTorch / EfficientNet-B0          |
| **Explainability**| Grad-CAM heatmap overlaid on uploaded X-ray to show model focus areas       | PyTorch + OpenCV                   |
| **Backend API**   | REST API accepting image upload, returning diagnosis + confidence score     | Django REST Framework              |
| **Frontend**      | Clean web interface for upload, results, and patient record management      | React.js                           |
| **Database**      | Patient scan history, results log, clinician notes                          | PostgreSQL                         |
| **Auth & Access** | Role-based login: admin, radiologist, clinician                             | JWT / Django Auth                  |

---

## 2. Learning Objectives

By the end of this project, students should be able to:

1. Load, preprocess, and augment medical image datasets for model training
2. Apply transfer learning using a pre-trained CNN (EfficientNet or ResNet) for binary image classification
3. Evaluate model performance using clinically appropriate metrics: accuracy, sensitivity (recall), specificity, and AUC-ROC
4. Implement Grad-CAM to generate visual explanations from a neural network
5. Build and document a REST API that serves an ML model as a microservice
6. Develop a functional React frontend that integrates with the ML backend
7. Design a monetizable SaaS product and present a credible business case

---

## 3. Recommended Technology Stack

| Layer               | Technology                                   | Rationale                                                              |
|---------------------|----------------------------------------------|------------------------------------------------------------------------|
| **ML Framework**    | PyTorch + torchvision                        | Industry standard; excellent pretrained model support                  |
| **Base Model**      | EfficientNet-B0 (pretrained on ImageNet)     | Strong accuracy, lightweight, ideal for medical imaging transfer learning |
| **Explainability**  | Grad-CAM via pytorch-grad-cam library        | Generates clinician-readable heatmaps; open source                     |
| **Backend**         | Django + Django REST Framework               | Robust, well-documented, familiar to Python-track students             |
| **Frontend**        | React.js + Tailwind CSS                      | Component-based, responsive, fast UI development                       |
| **Database**        | PostgreSQL                                   | Reliable relational DB for patient/scan record storage                 |
| **Image Storage**   | Local filesystem or Cloudinary (free tier)   | Stores uploaded and processed scan images                              |
| **ML Serving**      | Django view or Flask microservice            | Wraps the PyTorch model in an HTTP endpoint                            |
| **Deployment**      | Render.com or Railway.app (free tier)        | Simple cloud deployment within student budget                          |
| **Version Control** | GitHub (private repo)                        | Collaboration and submission                                           |

---

## 4. Recommended Datasets

Students must NOT collect or use real patient data. All training must use publicly available, ethically cleared, anonymised medical datasets.

| Dataset                       | Details                                                                                                           |
|-------------------------------|-------------------------------------------------------------------------------------------------------------------|
| **NIH ChestX-ray14**          | 108,948 frontal-view X-ray images from 32,717 patients. 14 disease labels including pneumonia, mass, nodule. Available on NIH website and Kaggle. Primary recommended dataset. |
| **Kaggle Chest X-Ray Pneumonia** | 5,863 labelled X-ray images (NORMAL vs PNEUMONIA). Simple binary classification — ideal for project scope. Available at kaggle.com/datasets/paultimothymooney/chest-xray-pneumonia |
| **RSNA Pneumonia Detection**  | 26,684 training images with bounding box annotations. More advanced — suitable for Phase 2 localisation features. |
| **COVID-19 Radiography Database** | Includes COVID-19, normal, viral pneumonia, and lung opacity classes. Good for multi-class extension.           |

> **Recommended Starting Point**  
> Begin with the Kaggle Chest X-Ray Pneumonia dataset (binary: Normal vs Pneumonia). It is small enough to train in a reasonable time on a free GPU (Google Colab), well-balanced, and widely used as a benchmark — allowing students to compare their results against published literature.

---

## 5. System Architecture

**Architecture Flow**

1. Clinician logs in → uploads chest X-ray image via React frontend  
2. React sends image to Django REST API (multipart/form-data POST)  
3. Django preprocesses image (resize to 224x224, normalize) and passes to PyTorch model  
4. Model returns: class prediction (Normal / Pneumonia) + confidence score (0–100%)  
5. Grad-CAM generates heatmap highlighting regions model focused on  
6. Django returns JSON: { prediction, confidence, heatmap_url, scan_id }  
7. React displays original X-ray, heatmap overlay, result, and disclaimer banner

---

## 6. Suggested Team Roles

| Role                     | Responsibilities                                                               | Key Deliverables                                      |
|--------------------------|--------------------------------------------------------------------------------|-------------------------------------------------------|
| **ML Engineer (1–2)**    | Dataset prep, model training, fine-tuning, Grad-CAM implementation, model evaluation | Trained model file (.pth), evaluation report, Grad-CAM output samples |
| **Backend Developer (1)**| Django REST API, model serving endpoint, database models, authentication       | API documentation, working endpoints, unit tests      |
| **Frontend Developer (1)**| React UI: upload flow, results display, dashboard, patient record view         | Responsive web app, integrated with API               |
| **Full-Stack / DevOps (1)**| Integration, deployment to cloud, environment setup, GitHub management         | Live deployed URL, README, deployment guide           |
| **Business Analyst / PM (1)** | Market research, monetisation plan, pitch deck, project documentation      | Business case report, 10-slide pitch deck             |

---

## 7. Eight-Week Implementation Roadmap

| Week     | Phase               | Tasks & Deliverables                                                                                                                                                     |
|----------|---------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Week 1** | **Setup & Research** | Download Kaggle dataset. Set up Python environment (PyTorch, torchvision). Explore and visualise dataset. Split into train/val/test (70/15/15). Set up Django project and PostgreSQL. Initialise GitHub repo with branching strategy. **Deliverable:** Working dev environment, dataset EDA notebook. |
| **Week 2** | **Model Training**   | Implement data loaders with augmentation (random flip, rotation, brightness). Load pre-trained EfficientNet-B0. Replace final layer for binary classification. Train for 10–20 epochs on Google Colab GPU. Log training/validation accuracy and loss curves. **Deliverable:** Baseline trained model with >85% validation accuracy. |
| **Week 3** | **Model Evaluation & Grad-CAM** | Evaluate on held-out test set. Generate: accuracy, precision, recall, specificity, AUC-ROC, confusion matrix. Implement Grad-CAM heatmap generation. Visual inspection: does the model focus on lung regions? Fine-tune if recall is below 85%. **Deliverable:** Evaluation report, Grad-CAM sample images. |
| **Week 4** | **Backend API**     | Build Django REST endpoints: POST /api/scan/upload, GET /api/scan/{id}/result. Integrate PyTorch model into Django view. Store scan metadata and results in PostgreSQL. Implement JWT-based user authentication. **Deliverable:** Functional API tested via Postman, API documentation. |
| **Week 5** | **Frontend — Core UI** | Build React components: login page, upload form, results display (X-ray + heatmap + prediction badge), disclaimer banner. Connect to Django API using Axios. Implement loading states and error handling. **Deliverable:** Working upload-to-result flow in browser. |
| **Week 6** | **Frontend — Dashboard & Records** | Add patient scan history dashboard. Clinician notes field per scan. Role-based views (admin vs clinician). Basic responsiveness for tablet use. **Deliverable:** Full working web application (local), user testing with 3–5 test users. |
| **Week 7** | **Deployment & Integration Testing** | Deploy Django backend to Render.com or Railway. Deploy React frontend to Vercel or Netlify. Configure CORS, environment variables, static file serving. End-to-end integration test. Fix bugs found in testing. **Deliverable:** Live deployed URL, all features functional in production. |
| **Week 8** | **Documentation & Pitch** | Write technical README (setup guide, API docs, model card). Prepare business case: target market, pricing model, revenue projections. Build 10-slide pitch deck. Record a 5-minute demo video. Final code review and cleanup. **Deliverable:** Complete submission package — code, docs, pitch deck, demo video. |

---

## 8. Model Performance Targets

The following minimum thresholds must be demonstrated on the held-out test set. Students must include a model card documenting dataset, architecture, training setup, and known limitations.

| Metric                 | Minimum Target & Explanation                                                                                              |
|------------------------|---------------------------------------------------------------------------------------------------------------------------|
| **Accuracy**           | >88% — Overall correct predictions across both classes                                                                     |
| **Sensitivity / Recall** | >90% — Critical: the model must not frequently miss actual pneumonia cases (false negatives are dangerous)               |
| **Specificity**        | >85% — Avoid excessive false positives that waste clinician time                                                          |
| **AUC-ROC Score**      | >0.92 — Strong discrimination between Normal and Pneumonia classes                                                         |
| **Grad-CAM Quality**   | Heatmap must visibly highlight lung regions, not background or image borders — assessed qualitatively                     |

> **Note on Recall vs Accuracy**  
> In medical AI, sensitivity (recall) is more important than raw accuracy. A model that is 95% accurate but misses 30% of actual pneumonia cases is clinically unacceptable. Students should optimise for recall and be prepared to explain this trade-off in their pitch.

---

## 9. Monetisation Strategy

### 9.1 Target Customers

- Private hospitals and specialist clinics (primary target — ability to pay)
- Independent diagnostic centres (X-ray, MRI, ultrasound labs)
- Telemedicine platforms seeking to add radiology support features
- NGOs and international health organisations operating in Nigeria (grant-funded tier)

### 9.2 Revenue Model

| Tier              | Price (Monthly)              | Inclusions                                                                 |
|-------------------|------------------------------|----------------------------------------------------------------------------|
| **Starter**       | ₦15,000 / month              | Up to 100 scans/month, 2 user accounts, basic result history               |
| **Professional**  | ₦40,000 / month              | Up to 500 scans/month, 10 user accounts, API access, priority support      |
| **Enterprise**    | Custom pricing               | Unlimited scans, white-label option, EHR integration, SLA guarantee        |
| **Pay-Per-Scan**  | ₦300 per scan                | For low-volume clinics; no monthly commitment                              |

### 9.3 Revenue Projections (Year 1)

| Scenario                                                | Projection                                                                 |
|---------------------------------------------------------|----------------------------------------------------------------------------|
| **Conservative (10 Starter + 3 Professional clients)**  | ₦150,000 + ₦120,000 = ₦270,000/month (~₦3.2M/year)                        |
| **Moderate (20 Starter + 8 Professional + 2 Enterprise)**| ₦300,000 + ₦320,000 + ₦200,000 = ₦820,000/month (~₦9.8M/year)             |
| **Break-even estimate**                                 | Approximately 8–10 paying Starter clients cover basic server and operating costs |

---

## 10. Ethical & Legal Constraints

> **Mandatory Requirements — All Team Members Must Acknowledge**
> 
> 1. **Decision Support Only:** MediScan NG must never present itself as a diagnostic tool. Every output screen must display a visible disclaimer.
> 2. **No Real Patient Data:** Students must use only publicly available, anonymised datasets. No data may be collected from hospitals, clinics, or individuals.
> 3. **Data Privacy:** Any demo user data created during testing must not include real names, dates of birth, or identifiers.
> 4. **Bias Awareness:** Students must acknowledge in their model card that the training dataset is predominantly from Western populations and may not perfectly generalise to Nigerian patient demographics.
> 5. **Regulatory Context:** Students must briefly note in their business case that a commercial deployment would require compliance with Nigeria's National Health Act and guidance from the Medical and Dental Council of Nigeria (MDCN).

---

## 11. Graded Deliverables

| Deliverable                | Weight | Description                                                                                     |
|----------------------------|--------|-------------------------------------------------------------------------------------------------|
| **GitHub Repository**      | 20%    | Clean, documented code. Meaningful commit history. README with setup instructions. Model card included. |
| **Trained Model + Evaluation Report** | 25%    | Model meeting performance targets. Confusion matrix, AUC-ROC curve, Grad-CAM samples. Written analysis of results. |
| **Live Deployed Application** | 20%    | Functional web app accessible via public URL. All features working in production environment.   |
| **Business Case Document** | 15%    | Market analysis, revenue model, competitive landscape, 3-year financial projection.            |
| **Final Pitch Presentation** | 15%    | 10-slide deck + 5-min demo video. Covers problem, solution, tech, business model, roadmap.     |
| **Team Peer Review**       | 5%     | Each member evaluates teammates' contribution confidentially.                                   |

---

## 12. Stretch Goals (If Time Permits)

- Multi-class detection — extend model to detect tuberculosis, pleural effusion, or cardiomegaly
- Mobile-responsive PWA — allow upload from tablet devices used in ward rounds
- DICOM file support — handle standard medical imaging file format (.dcm) rather than JPEG only
- EHR integration stub — design an API interface for connecting to hospital management systems like EduManage NG or open-source EMR platforms
- WhatsApp result delivery — send scan result summary to clinician via WhatsApp Business API (Twilio/Vonage)

---

## 13. Learning Resources

| Resource                            | Link / Details                                                                                             |
|-------------------------------------|-------------------------------------------------------------------------------------------------------------|
| **Kaggle Chest X-Ray Dataset**      | kaggle.com/datasets/paultimothymooney/chest-xray-pneumonia                                                  |
| **NIH ChestX-ray14**                | nihcc.app.box.com/v/ChestXray-NIHCC                                                                         |
| **PyTorch Transfer Learning Tutorial** | pytorch.org/tutorials/beginner/transfer_learning_tutorial.html                                            |
| **pytorch-grad-cam Library**        | github.com/jacobgil/pytorch-grad-cam                                                                        |
| **Django REST Framework Docs**      | django-rest-framework.org                                                                                   |
| **React + Axios Tutorial**          | axios-http.com/docs/intro                                                                                   |
| **Render.com (Free Deployment)**    | render.com                                                                                                  |
| **Google Colab (Free GPU)**         | colab.research.google.com                                                                                   |
| **Chest X-Ray AI Paper (CheXNet)**  | arxiv.org/abs/1711.05225 — Stanford baseline reference                                                      |

---

*This brief was developed for use in the Integrated Design Project course. All dataset and deployment links are subject to availability. Students are encouraged to explore extensions aligned with the Nigerian healthcare context.*