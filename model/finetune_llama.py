import os
from datasets import load_dataset, Dataset
from transformers import AutoTokenizer, AutoModelForCausalLM, TrainingArguments, Trainer, DataCollatorForLanguageModeling
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
import torch

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(MODEL_DIR, 'finetune_data.jsonl')
OUTPUT_DIR = os.path.join(MODEL_DIR, 'llama-finetuned')
BASE_MODEL = 'TinyLlama/TinyLlama-1.1B-Chat-v1.0'  # Switched to open model for dev

def main():
    # Load dataset
    dataset = load_dataset('json', data_files=DATA_PATH, split='train')

    # Load tokenizer and model
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
    model = AutoModelForCausalLM.from_pretrained(BASE_MODEL)

    # Tokenization function
    def tokenize_function(example):
        full_text = example["prompt"] + "\n" + example["completion"]
        tokens = tokenizer(
            full_text,
            truncation=True,
            padding="max_length",
            max_length=512,
        )
        tokens["labels"] = tokens["input_ids"].copy()
        return tokens

    tokenized_dataset = dataset.map(
        tokenize_function,
        batched=False,
        remove_columns=dataset.column_names  # Remove original string fields
    )

    # Prepare for QLoRA/PEFT
    model = prepare_model_for_kbit_training(model)
    lora_config = LoraConfig(
        r=8,
        lora_alpha=16,
        target_modules=["q_proj", "v_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM"
    )
    model = get_peft_model(model, lora_config)

    # Training args
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        per_device_train_batch_size=2,
        num_train_epochs=3,
        learning_rate=2e-4,
        fp16=False,  # Disable mixed precision for Mac compatibility
        logging_steps=10,
        save_steps=50,
        save_total_limit=2,
        report_to=None,
        remove_unused_columns=False,
        push_to_hub=False,
    )
    data_collator = DataCollatorForLanguageModeling(tokenizer, mlm=False)

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset,
        data_collator=data_collator,
    )
    trainer.train()
    trainer.save_model(OUTPUT_DIR)

if __name__ == '__main__':
    main() 