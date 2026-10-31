CONDITION_ORDER = ["Pneumonia", "Cardiomegaly", "Lung Nodule / Mass", "Tuberculosis"]

DISCLAIMER = (
    "For research and clinical decision support only; this is not a diagnosis. "
    "Scores are uncalibrated model outputs, not probabilities of disease, and "
    "confidence_pct is simply score x 100. Every result must be reviewed by a "
    "qualified clinician. Tuberculosis results are experimental."
)

# ---- organisations ----
ORG_TYPES = ("hospital", "diagnostic_centre", "clinic", "telemedicine")

# The 36 states plus the FCT, spelled as in the signup form
# (frontend/src/utils/DummyData.ts), which at the time of writing leaves out "Benue".
NIGERIAN_STATES = (
    "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
    "Cross River",
    "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna",
    "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun",
    "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
)

# +234 or a leading 0, then ten digits (api-contract.md section 0).
ORG_PHONE_PATTERN = r"^(\+234|0)\d{10}$"

