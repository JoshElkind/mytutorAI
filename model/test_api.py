#!/usr/bin/env python3
"""
Test script for the RAG API
"""
import requests
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_api_health():
    """Test if the API is running"""
    try:
        response = requests.get("http://127.0.0.1:8000/docs")
        return response.status_code == 200
    except requests.exceptions.ConnectionError:
        return False

def test_generate_from_url():
    """Test the generate_from_url endpoint"""
    test_url = "http://127.0.0.1:3000/test_file.pdf" 
    
    payload = {
        "file_url": test_url,
        "qtype": "multiple_choice",
        "n": 3
    }
    
    try:
        response = requests.post(
            "http://127.0.0.1:8000/generate_from_url",
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return True
        else:
            return False
            
    except requests.exceptions.RequestException as e:
        return False
    except json.JSONDecodeError as e:
        return False

if __name__ == "__main__":
    logger.info("Starting API tests...")
    
    if not test_api_health():
        logger.error("API health check failed. Make sure the API is running.")
        exit(1)
    
    if test_generate_from_url():
        logger.info("All tests passed!")
    else:
        logger.error("Generate test failed!")
        exit(1) 