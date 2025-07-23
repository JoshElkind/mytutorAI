import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TitleCasePipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResourcesService } from './resources.service';
import { Resource, Material } from './resource.interface';
import { ChangeDetectorRef } from '@angular/core';
import { saveAs } from 'file-saver';
import { LoadingPopupComponent } from './loading-popup/loading-popup';

@Component({
  selector: 'app-resources',
  standalone: true,
  imports: [CommonModule, TitleCasePipe, DatePipe, FormsModule, LoadingPopupComponent],
  templateUrl: './resources.html',
  styleUrls: ['./resources.scss']
})
export class ResourcesComponent implements OnInit {
  resources: Resource[] = [];
  materials: Material[] = [];
  showUploadModal = false;
  showMaterialModal: boolean = false;
  showDeleteModal = false;
  showMaterialViewModal = false;
  resourceToDelete: Resource | null = null;
  materialToDelete: Material | null = null;
  selectedMaterialForView: Material | null = null;
  selectedFile: File | null = null;
  selectedFilter = 'all';
  resourceSearch: string = '';
  resourceSearchTerm: string = '';
  selectedResourceIds: string[] = [];
  newMaterial: any = { name: '' };
  newResource: any = { name: '', type: '' };
  isDragOver = false;
  showTypeDropdown = false;
  showErrors = false;
  
  // Generate modal properties
  showGenerateModal = false;
  generateForm = {
    name: '',
    questionCount: 5,
    selectedResourceId: '',
    questionType: 'multiple_choice'
  };
  learningResources: Resource[] = [];
  showQuestionTypeDropdown = false;
  isDeletingResource = false;
  isGenerating = false;
  
  // Loading popup properties
  showLoadingPopup = false;
  loadingTitle = 'Generating Quiz...';
  loadingMessage = 'Please wait while we create your quiz questions.';

  constructor(
    private resourcesService: ResourcesService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadResources();
    this.loadMaterials();
  }

  loadResources() {
    this.resourcesService.getMyResources().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          this.resources = data;
        } else if (data && data.data && Array.isArray(data.data.myResources)) {
          this.resources = data.data.myResources;
        } else {
          this.resources = [];
        }
        // Filter learning resources for generate modal
        this.learningResources = this.resources.filter(resource => resource.resourceType === 'learning');
        this.changeDetectorRef.detectChanges();
      },
      error: (error: any) => {
        this.resources = [];
        this.learningResources = [];
      }
    });
  }

  loadMaterials() {
    this.resourcesService.getMyMaterials().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          this.materials = data;
        } else if (data && data.data && Array.isArray(data.data.myMaterials)) {
          this.materials = data.data.myMaterials;
        } else {
          this.materials = [];
        }
        this.changeDetectorRef.detectChanges();
      },
      error: (error: any) => {
        this.materials = [];
      }
    });
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
    
    if (event.dataTransfer?.files.length) {
      this.selectedFile = event.dataTransfer.files[0];
    }
  }

  removeFile() {
    this.selectedFile = null;
  }

  canUpload(): boolean {
    return !!(this.newResource.name && this.newResource.type && this.selectedFile);
  }

  uploadResource() {
    if (!this.selectedFile || !this.newResource.name || !this.newResource.type) {
      return;
    }

    if (this.resourceNameExists(this.newResource.name.trim())) {
      alert('A resource with this name already exists');
      return;
    }

    const resourceName = this.newResource.name;
    const resourceType = this.newResource.type;
    const file = this.selectedFile;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(',')[1];

      this.resourcesService.uploadResource(
        resourceName,
        resourceType,
        base64,
        file.name,
        file.type
      ).subscribe({
        next: (res) => {
          // Only close modal and reset after successful upload
          this.showUploadModal = false;
          this.selectedFile = null;
          this.newResource = { name: '', type: '' };
          this.isDragOver = false;
          this.showTypeDropdown = false;
          this.showErrors = false;
          this.loadResources();
        },
        error: (err) => {
          alert('Failed to upload resource. Please try again.');
        }
      });
    };
    reader.readAsDataURL(file);
  }

  deleteResource(resource: Resource) {
    this.resourceToDelete = resource;
    this.showDeleteModal = true;
  }

  confirmDeleteResource() {
    if (!this.resourceToDelete) return;
    const deletedResourceId = this.resourceToDelete.id;
    const prevResources = [...this.resources];
    // Optimistically remove the resource from the UI
    this.resources = this.resources.filter(r => r.id !== deletedResourceId);
    // Close modal immediately
    this.showDeleteModal = false;
    this.resourceToDelete = null;
    this.resourcesService.deleteResource(deletedResourceId).subscribe({
      next: () => {
        this.loadResources();
      },
      error: (error: any) => {
        // Restore the resource if deletion failed
        this.resources = prevResources;
        this.changeDetectorRef.detectChanges();
        alert('Failed to delete resource. Please try again.');
      }
    });
  }

  createMaterial() {
    if (!this.canCreateMaterial()) return;
    this.resourcesService.createMaterial(
      this.newMaterial.name,
      'Material package',
      this.selectedResourceIds
    ).subscribe({
      next: (data: any) => {
        this.closeMaterialModal();
        this.loadMaterials();
      },
      error: (error: any) => {
        alert('Error creating material package');
      }
    });
  }

  deleteMaterial(material: Material) {
    this.materialToDelete = material;
    this.showDeleteModal = true;
  }

  confirmDeleteMaterial() {
    if (!this.materialToDelete) return;
    // Optimistically remove the material from the UI
    const deletedMaterialId = this.materialToDelete.id;
    const prevMaterials = [...this.materials];
    this.materials = this.materials.filter(m => m.id !== deletedMaterialId);
    // Close modal immediately
    this.showDeleteModal = false;
    this.materialToDelete = null;
    this.changeDetectorRef.detectChanges();
    this.resourcesService.deleteMaterial(deletedMaterialId).subscribe({
      next: () => {
        this.loadMaterials();
      },
      error: (error: any) => {
        // Restore the material if deletion failed
        this.materials = prevMaterials;
        this.changeDetectorRef.detectChanges();
        alert('Failed to delete material. Please try again.');
      }
    });
  }

  openUploadModal() {
    this.showUploadModal = true;
  }

  closeUploadModal() {
    this.showUploadModal = false;
    this.selectedFile = null;
    this.newResource = { name: '', type: '' };
    this.isDragOver = false;
    this.showTypeDropdown = false;
    this.showErrors = false;
  }

  triggerFileInput() {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  selectResourceType(type: string) {
    this.newResource.type = type;
  }

  onResourceSearch() {
    // This will trigger the filteredResources getter to update
    this.changeDetectorRef.detectChanges();
  }

  openMaterialModal() {
    this.showMaterialModal = true;
    this.newMaterial = { name: '' };
    this.selectedResourceIds = [];
    this.resourceSearchTerm = '';
  }

  closeMaterialModal() {
    this.showMaterialModal = false;
  }

  openMaterialViewModal(material: Material) {
    this.selectedMaterialForView = material;
    this.showMaterialViewModal = true;
  }

  closeMaterialViewModal() {
    this.showMaterialViewModal = false;
    this.selectedMaterialForView = null;
  }

  getResourceById(resourceId: string): Resource | undefined {
    return this.resources.find(resource => resource.id === resourceId);
  }

  canCreateMaterial(): boolean {
    return this.newMaterial.name.trim() !== '' && 
           this.selectedResourceIds.length > 0 && 
           !this.materialNameExists(this.newMaterial.name.trim());
  }

  materialNameExists(name: string): boolean {
    return this.materials.some(material => 
      material.name.toLowerCase() === name.toLowerCase()
    );
  }

  resourceNameExists(name: string): boolean {
    return this.resources.some(resource => 
      resource.name.toLowerCase() === name.toLowerCase()
    );
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.resourceToDelete = null;
    this.materialToDelete = null;
  }

  toggleResourceSelection(resourceId: string) {
    const index = this.selectedResourceIds.indexOf(resourceId);
    if (index > -1) {
      this.selectedResourceIds.splice(index, 1);
    } else {
      this.selectedResourceIds.push(resourceId);
    }
  }

  get filteredResources() {
    let filtered = this.resources;
    
    // Filter by type
    if (this.selectedFilter !== 'all') {
      filtered = filtered.filter(resource => 
        resource.resourceType.toLowerCase() === this.selectedFilter.toLowerCase()
      );
    }
    
    // Filter by search term
    if (this.resourceSearch && this.resourceSearch.trim()) {
      const searchTerm = this.resourceSearch.toLowerCase().trim();
      filtered = filtered.filter(resource => 
        resource.name.toLowerCase().includes(searchTerm) ||
        resource.resourceType.toLowerCase().includes(searchTerm)
      );
    }
    
    return filtered;
  }

  get filteredResourcesForSelection() {
    return this.resources.filter(resource => 
      resource.name.toLowerCase().includes(this.resourceSearchTerm.toLowerCase()) ||
      resource.resourceType.toLowerCase().includes(this.resourceSearchTerm.toLowerCase())
    );
  }

  previewResource(resource: Resource | undefined) {
    if (!resource || !resource.fileUrl) return;

    // Determine the file extension from the fileName or contentType
    let extension = '';
    if (resource.fileName && resource.fileName.includes('.')) {
      extension = resource.fileName.substring(resource.fileName.lastIndexOf('.'));
    } else if (resource.contentType === 'application/pdf') {
      extension = '.pdf';
    } else if (resource.contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      extension = '.docx';
    }
    const downloadName = resource.name + extension;

    // Fetch the file as a blob and trigger download
    fetch(resource.fileUrl, { credentials: 'include' })
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 100);
      })
      .catch(() => {
        alert('Failed to download file.');
      });
  }



  addResourceToMaterial(resource: Resource) {
    if (!this.selectedResourceIds.includes(resource.id)) {
      this.selectedResourceIds.push(resource.id);
    }
  }

  // Generate modal methods
  openGenerateModal() {
    this.showGenerateModal = true;
    this.generateForm = {
      name: '',
      questionCount: 5,
      selectedResourceId: '',
      questionType: 'multiple_choice'
    };
    this.showErrors = false;
    this.changeDetectorRef.detectChanges();
  }

  generateResource() {
    
    // Validate form
    if (!this.generateForm.selectedResourceId || !this.generateForm.name || !this.generateForm.questionType) {
      alert('Please select a resource, enter a name, and choose a question type.');
      return;
    }
    
    if (this.resourceNameExists(this.generateForm.name.trim())) {
      alert('A resource with this name already exists. Please choose a different name.');
      return;
    }
    
    const numQuestions = Math.min(this.generateForm.questionCount || 5, 5);
    const selectedResource = this.resources.find(r => r.id === this.generateForm.selectedResourceId);
    
    if (!selectedResource || !selectedResource.fileUrl) {
      alert('Selected resource is invalid or missing file URL.');
      return;
    }
    
    // Close generate modal immediately
    this.showGenerateModal = false;
    
    // Show loading popup
    this.showLoadingPopup = true;
    this.loadingTitle = 'Generating Quiz...';
    this.loadingMessage = 'Analyzing your learning resource...';
    
    this.isGenerating = true;
    this.resourcesService.generateQuizFromResource(selectedResource.fileUrl, this.generateForm.questionType, numQuestions)
      .subscribe({
        next: (response) => {
          
          // Create DOCX file from questions
          this.createAndUploadQuizDocx(response.questions, this.generateForm.name);
        },
        error: (err) => {
          this.handleGenerateError(err, 'Failed to generate quiz: ' + (err?.error?.detail || err.message));
        }
      });
  }

  async createAndUploadQuizDocx(questions: string[], quizName: string) {
    
    try {
      // Use docx library to create a DOCX file in browser
      const { Document, Packer, Paragraph, TextRun } = await import('docx');
      
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                children: [new TextRun({ text: quizName, bold: true, size: 32 })],
                spacing: { after: 400 }
              }),
              ...questions.map(q => new Paragraph({ text: q, spacing: { after: 200 } }))
            ]
          }
        ]
      });
      
      const blob = await Packer.toBlob(doc);
      
      // Upload as new quiz resource
      const file = new File([blob], quizName + '.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        
        this.resourcesService.uploadResource(
          quizName,
          'quiz',
          base64,
          quizName + '.docx',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ).subscribe({
          next: (res) => {
            this.loadingMessage = 'Quiz generated successfully!';
            
            // Hide loading popup after a short delay
            setTimeout(() => {
              this.showLoadingPopup = false;
              this.isGenerating = false;
              this.loadResources();
            }, 1000);
          },
          error: (err) => {
            this.handleGenerateError(err, 'Failed to upload generated quiz: ' + (err?.error?.message || err.message));
          }
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      this.handleGenerateError(error, 'Failed to create quiz document');
    }
  }

  closeGenerateModal() {
    this.showGenerateModal = false;
    this.generateForm = {
      name: '',
      questionCount: 5,
      selectedResourceId: '',
      questionType: 'multiple_choice'
    };
    this.showErrors = false;
  }

  filteredLearningResources(): Resource[] {
    const term = this.resourceSearchTerm?.toLowerCase() || '';
    return this.learningResources.filter(resource =>
      resource.name.toLowerCase().includes(term)
    );
  }

  selectResourceForGeneration(resource: Resource) {
    this.generateForm.selectedResourceId = resource.id;
    this.resourceSearchTerm = '';
  }

  getSelectedResourceName(): string {
    const resource = this.learningResources.find(r => r.id === this.generateForm.selectedResourceId);
    return resource ? resource.name : '';
  }

  canGenerate(): boolean {
    return this.generateForm.name.trim() !== '' && 
           this.generateForm.questionCount >= 1 && 
           this.generateForm.questionCount <= 5 &&
           this.generateForm.selectedResourceId !== '';
  }



  getWordCount(resource: Resource): number {
    // TODO: Implement actual word count logic by reading the file contents
    return resource.wordCount ?? 0;
  }

  getCharCount(resource: Resource): number {
    // TODO: Implement actual character count logic by reading the file contents
    return resource.charCount ?? 0;
  }

  getFileSize(resource: Resource): string {
    if (!resource.fileSize) return '';
    const size = resource.fileSize;
    if (size < 1024) return `${size} bytes`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }

  selectQuestionType(type: string) {
    this.generateForm.questionType = type;
  }

  // Error handling for loading popup
  private handleGenerateError(error: unknown, message: string) {
    this.showLoadingPopup = false;
    this.isGenerating = false;
    
    // Safely extract error message
    let errorMessage = message;
    if (error instanceof Error) {
      errorMessage = `${message}: ${error.message}`;
    } else if (typeof error === 'string') {
      errorMessage = `${message}: ${error}`;
    }
    
    alert(errorMessage);
  }
}
