import os
import re
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from PyPDF2 import PdfReader
from docx import Document

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
CHROMA_DIR = os.path.join(MODEL_DIR, 'chroma_db')
PDF_PATHS = {
    'trig.pdf': os.path.join(MODEL_DIR, 'trig.pdf'),
    'eng.pdf': os.path.join(MODEL_DIR, 'eng.pdf'),
}
DOCX_PATHS = {
    'sci.docx': os.path.join(MODEL_DIR, 'sci.docx'),
}

# Text extraction and cleaning (reuse logic)
def extract_pdf_text(pdf_path):
    reader = PdfReader(pdf_path)
    text = []
    for page in reader.pages:
        text.append(page.extract_text() or "")
    return "\n".join(text)

def extract_docx_text(docx_path):
    doc = Document(docx_path)
    text = []
    for para in doc.paragraphs:
        text.append(para.text)
    return "\n".join(text)

def clean_paragraphs(text):
    text = re.sub(r'[^\x20-\x7E\n]', '', text)
    paras = re.split(r'\n{2,}|\n', text)
    cleaned = []
    for para in paras:
        para = para.strip()
        if len(para) < 40:
            continue
        if len(re.sub(r'[^a-zA-Z0-9]', '', para)) < 0.5 * len(para):
            continue
        para = re.sub(r'\s+', ' ', para)
        cleaned.append(para)
    return cleaned

doc_chunks = []
metadatas = []
for name, path in PDF_PATHS.items():
    raw = extract_pdf_text(path)
    paras = clean_paragraphs(raw)
    for i, para in enumerate(paras):
        doc_chunks.append(para)
        metadatas.append({"source": name, "chunk": i})
for name, path in DOCX_PATHS.items():
    raw = extract_docx_text(path)
    paras = clean_paragraphs(raw)
    for i, para in enumerate(paras):
        doc_chunks.append(para)
        metadatas.append({"source": name, "chunk": i})

NEW_DOCX = os.path.join(MODEL_DIR, 'test.docx')
if os.path.exists(NEW_DOCX):
    raw = extract_docx_text(NEW_DOCX)
    paras = clean_paragraphs(raw)
    for i, para in enumerate(paras):
        doc_chunks.append(para)
        metadatas.append({"source": 'test.docx', "chunk": i})

# Further split long paragraphs if needed
splitter = RecursiveCharacterTextSplitter(chunk_size=400, chunk_overlap=40)
all_chunks = []
all_metadatas = []
for para, meta in zip(doc_chunks, metadatas):
    splits = splitter.split_text(para)
    for j, chunk in enumerate(splits):
        all_chunks.append(chunk)
        m = meta.copy()
        m["subchunk"] = j
        all_metadatas.append(m)

# Embedding model (use a small, open model for dev)
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

# Create Chroma DB
if os.path.exists(CHROMA_DIR):
    import shutil
    shutil.rmtree(CHROMA_DIR)
vectorstore = Chroma.from_texts(all_chunks, embeddings, metadatas=all_metadatas, persist_directory=CHROMA_DIR)
vectorstore.persist()
print(f"Chroma DB created at {CHROMA_DIR} with {len(all_chunks)} chunks.") 