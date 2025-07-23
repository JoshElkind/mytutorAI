import os
import pandas as pd
import json
from PyPDF2 import PdfReader
from docx import Document
import re

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(MODEL_DIR, 'questions.csv')
PDF_PATHS = {
    'trig.pdf': os.path.join(MODEL_DIR, 'trig.pdf'),
    'eng.pdf': os.path.join(MODEL_DIR, 'eng.pdf'),
}
DOCX_PATHS = {
    'sci.docx': os.path.join(MODEL_DIR, 'sci.docx'),
}

# Extract text from PDF
def extract_pdf_text(pdf_path):
    reader = PdfReader(pdf_path)
    text = []
    for page in reader.pages:
        text.append(page.extract_text() or "")
    return "\n".join(text)

# Extract text from DOCX
def extract_docx_text(docx_path):
    doc = Document(docx_path)
    text = []
    for para in doc.paragraphs:
        text.append(para.text)
    return "\n".join(text)

# Clean and chunk text into paragraphs

def clean_paragraphs(text):
    # Remove non-printable/control characters
    text = re.sub(r'[^\x20-\x7E\n]', '', text)
    # Split into paragraphs by double newlines or single newlines
    paras = re.split(r'\n{2,}|\n', text)
    cleaned = []
    for para in paras:
        para = para.strip()
        # Remove lines that are too short or mostly symbols
        if len(para) < 40:
            continue
        # Remove lines with too many non-alphanumeric chars
        if len(re.sub(r'[^a-zA-Z0-9]', '', para)) < 0.5 * len(para):
            continue
        # Collapse multiple spaces
        para = re.sub(r'\s+', ' ', para)
        cleaned.append(para)
    return cleaned

# Load all document texts (cleaned)
doc_texts = {}
for name, path in PDF_PATHS.items():
    raw = extract_pdf_text(path)
    doc_texts[name] = clean_paragraphs(raw)
for name, path in DOCX_PATHS.items():
    raw = extract_docx_text(path)
    doc_texts[name] = clean_paragraphs(raw)

# Read CSV
df = pd.read_csv(CSV_PATH)

# Output for LLM fine-tuning
output_path = os.path.join(MODEL_DIR, 'finetune_data.jsonl')
with open(output_path, 'w') as fout:
    for _, row in df.iterrows():
        doc_name = row['document']
        question = row['question']
        qtype = row['type']
        context_paras = doc_texts.get(doc_name, [])
        # Use up to 2 paragraphs for context (or all if short)
        context = '\n\n'.join(context_paras[:2]) if context_paras else ''
        data = {
            'prompt': f"Context:\n{context}\n\nGenerate a {qtype} quiz question based on the above context.",
            'completion': question
        }
        fout.write(json.dumps(data) + '\n') 