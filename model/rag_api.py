import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import requests
from fastapi import UploadFile, File
import tempfile
from PyPDF2 import PdfReader
from docx import Document
import re

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
CHROMA_DIR = os.path.join(MODEL_DIR, 'chroma_db')
LLM_DIR = os.path.join(MODEL_DIR, 'llama-finetuned')

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://127.0.0.1:4200"],  # Angular dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Chroma vectorstore and embedding model
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
vectorstore = Chroma(persist_directory=CHROMA_DIR, embedding_function=embeddings)

# fine-tuned Llama model
llm_tokenizer = AutoTokenizer.from_pretrained(LLM_DIR)
llm_model = AutoModelForCausalLM.from_pretrained(LLM_DIR)

def generate_questions(context, qtype, n=5):
    
    # more specific prompt for different question types
    if qtype == "multiple_choice":
        prompt = f"""Based on the following context, create exactly {n} multiple choice questions. Each question should have 4 options (A, B, C, D) and test understanding of the material. Do NOT include answers.

Context:
{context}

Questions:"""
    elif qtype == "short_answer":
        prompt = f"""Based on the following context, create exactly {n} short answer questions that require brief responses. Do NOT include answers or multiple choice options.

Context:
{context}

Questions:"""
    elif qtype == "long_answer":
        prompt = f"""Based on the following context, create exactly {n} essay questions that require detailed responses. Do NOT include answers.

Context:
{context}

Questions:"""
    else:
        prompt = f"""Based on the following context, create exactly {n} questions. Do NOT include answers.

Context:
{context}

Questions:"""
    
    try:
        input_ids = llm_tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512).input_ids
        
        with torch.no_grad():
            output = llm_model.generate(input_ids, max_new_tokens=300, do_sample=True, top_p=0.95, temperature=0.7, num_return_sequences=1)
        
        # Decode the full response
        full_response = llm_tokenizer.decode(output[0], skip_special_tokens=True)
        
        # Extract questions from the response
        # Look for the part after "Questions:" or split by newlines and filter
        if "Questions:" in full_response:
            questions_text = full_response.split("Questions:")[-1].strip()
        else:
            questions_text = full_response
        
        # Split into individual questions and clean them
        questions = []
        lines = questions_text.split('\n')
        current_question = ""
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            if (re.match(r'^\d+\.', line) or 
                re.match(r'^Q\d+\.', line) or 
                line.startswith('Question') or
                line.endswith('?')):
                if current_question:
                    questions.append(current_question.strip())
                current_question = line
            else:
                # Continue the current question
                if current_question:
                    current_question += " " + line
                else:
                    current_question = line
        
        if current_question:
            questions.append(current_question.strip())
        
        cleaned_questions = []
        for q in questions:
            if q and len(q) > 10 and not q.startswith("Generate"):
                # Remove answer sections for all question types
                if qtype == "short_answer" or qtype == "long_answer":
                    # Remove any "Answer:" sections
                    q = re.sub(r'\s*Answer:.*$', '', q, flags=re.IGNORECASE)
                    q = re.sub(r'\s*[a-d]\.\s*[^?]*', '', q, flags=re.IGNORECASE)
                elif qtype == "multiple_choice":
                    # For multiple choice, keep the options but remove answer sections
                    q = re.sub(r'\s*Answer:.*$', '', q, flags=re.IGNORECASE)
                
                q = q.strip()
                
                if not q.endswith('?') and not q.endswith('.') and not q.endswith('!'):
                    q += '?'
                
                # Ensure minimum length and proper formatting
                if q and len(q) > 10 and not q.startswith("Generate") and not q.startswith("Additional"):
                    if not q.endswith(' ') and len(q.split()) > 2:
                        cleaned_questions.append(q)
        
        if len(cleaned_questions) < n:
            additional_context = context[:500]  # Use first 500 chars for additional questions
            additional_prompt = f"Based on this context, create {n - len(cleaned_questions)} more {qtype} questions:\n{additional_context}\n\nQuestions:"
            
            try:
                additional_input_ids = llm_tokenizer(additional_prompt, return_tensors="pt", truncation=True, max_length=512).input_ids
                with torch.no_grad():
                    additional_output = llm_model.generate(additional_input_ids, max_new_tokens=128, do_sample=True, top_p=0.95, temperature=0.8, num_return_sequences=n - len(cleaned_questions))
                
                additional_questions = []
                for o in additional_output:
                    question = llm_tokenizer.decode(o, skip_special_tokens=True).split("\n")[-1].strip()
                    # Clean the additional question
                    if qtype == "short_answer" or qtype == "long_answer":
                        question = re.sub(r'\s*Answer:.*$', '', question, flags=re.IGNORECASE)
                        question = re.sub(r'\s*[a-d]\.\s*[^?]*', '', question, flags=re.IGNORECASE)
                    elif qtype == "multiple_choice":
                        question = re.sub(r'\s*Answer:.*$', '', question, flags=re.IGNORECASE)
                    
                    question = question.strip()
                    if question and len(question) > 10 and not question.startswith("Generate") and not question.startswith("Additional"):
                        additional_questions.append(question)
                
                cleaned_questions.extend(additional_questions[:n - len(cleaned_questions)])
            except Exception as e:
                # If additional generation fails, pad with simple questions
                while len(cleaned_questions) < n:
                    cleaned_questions.append(f"What is a key concept from the {qtype} material?")
        
        elif len(cleaned_questions) > n:
            cleaned_questions = cleaned_questions[:n]
        
        return cleaned_questions
    except Exception as e:
        raise

def extract_pdf_text_from_file(file_path):
    try:
        reader = PdfReader(file_path)
        text = []
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            text.append(page_text)
        result = "\n".join(text)
        return result
    except Exception as e:
        raise

def extract_docx_text_from_file(file_path):
    try:
        doc = Document(file_path)
        text = []
        for i, para in enumerate(doc.paragraphs):
            text.append(para.text)
        result = "\n".join(text)
        return result
    except Exception as e:
        raise

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

class GenerateRequest(BaseModel):
    resource: str
    qtype: str
    n: int = 5

class GenerateResponse(BaseModel):
    questions: List[str]

@app.post("/generate", response_model=GenerateResponse)
def generate_endpoint(req: GenerateRequest):
    # Retrieve top chunks for the resource
    docs = vectorstore.similarity_search(req.resource, k=3, filter={"source": req.resource})
    if not docs:
        raise HTTPException(status_code=404, detail="Resource not found or no content available.")
    # Concatenate top chunks as context
    context = "\n\n".join([d.page_content for d in docs])
    questions = generate_questions(context, req.qtype, n=req.n)
    return GenerateResponse(questions=questions)

class GenerateFromUrlRequest(BaseModel):
    file_url: str
    qtype: str
    n: int = 5

@app.post("/generate_from_url", response_model=GenerateResponse)
def generate_from_url(req: GenerateFromUrlRequest):
    
    try:
        with tempfile.NamedTemporaryFile(delete=True) as tmp:
            r = requests.get(req.file_url)
            if r.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to download file.")
            
            # Determine file type
            if req.file_url.lower().endswith('.pdf'):
                raw = extract_pdf_text_from_file(tmp.name)
            elif req.file_url.lower().endswith('.docx'):
                raw = extract_docx_text_from_file(tmp.name)
            else:
                raise HTTPException(status_code=400, detail="Unsupported file type.")
            
            paras = clean_paragraphs(raw)
            
            splitter = RecursiveCharacterTextSplitter(chunk_size=400, chunk_overlap=40)
            all_chunks = []
            for para in paras:
                all_chunks.extend(splitter.split_text(para))
            
            context = "\n\n".join(all_chunks[:3])
            
            # Generate questions
            questions = generate_questions(context, req.qtype, n=req.n)
            
            return GenerateResponse(questions=questions)
    except Exception as e:
        raise

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 