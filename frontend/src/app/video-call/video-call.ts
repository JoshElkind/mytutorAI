import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Material } from '../resources/resource.interface';
import { AuthService, User } from '../auth/auth.service';
import { Router, Navigation } from '@angular/router';
import { TutorProfilePreviewComponent, TutorProfile } from '../explore/tutor-profile-preview/tutor-profile-preview';
import { ChatPopupService } from '../chat/chat-popup.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-video-call',
  standalone: true,
  imports: [CommonModule, HttpClientModule, TutorProfilePreviewComponent],
  templateUrl: './video-call.html',
  styleUrl: './video-call.scss'
})
export class VideoCallComponent implements OnInit, OnDestroy {
  localStream: MediaStream | null = null;
  remoteStream: MediaStream | null = null;
  mediaRecorder: MediaRecorder | null = null;
  isMicMuted = false;
  isCamOff = false;
  sessionId: string | null = null;
  materials: Material[] = [];
  selectedMaterial: Material | null = null;
  currentUser: User | null = null;
  session: any = null;
  remoteJoined = false;
  remoteCamOff = true;
  showProfilePreview = false;
  selectedProfile: TutorProfile | null = null;
  peerConnection: RTCPeerConnection | null = null;
  isInitiator = false;
  hasSetupPeerConnection = false;

  participantRole: string = '';
  otherUserProfileUrl: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private chatPopup: ChatPopupService
  ) {}

  async ngOnInit() {
    try {
      // Get current user
      this.currentUser = this.authService.getCurrentUser();

      // Retrieve session from navigation state
      const nav: Navigation | null = this.router.getCurrentNavigation();
      if (nav && nav.extras && nav.extras.state && (nav.extras.state as any).session) {
        this.session = (nav.extras.state as any).session;
      }

      // Grab sessionId from route
      this.sessionId = this.route.snapshot.paramMap.get('sessionId');

      // If we navigated directly (e.g., page refresh or header link), fetch session via GraphQL
      if (!this.session && this.sessionId) {
        const response: any = await firstValueFrom(this.http
          .post('http://127.0.0.1:3000/graphql', {
            query: `query GetSession($id: ID!) {
              session(id: $id) {
                id
                tutorId
                studentId
                tutorEmail
                tutorName
                studentEmail
                studentName
                lessonName
                startTime
                endTime
                duration
                materials {
                  id
                  name
                  description
                  resourceIds
                  resources {
                    id
                    name
                    resourceType
                    fileUrl
                    pdfPreviewUrl
                  }
                }
              }
            }`,
            variables: { id: this.sessionId }
          }));

        this.session = response?.data?.session;
      }

      // Authorization check: only tutor or student can join
      if (!this.session || !this.currentUser || ![this.session.tutorEmail, this.session.studentEmail].includes(this.currentUser.email)) {
        alert('You are not authorized to join this call.');
        this.router.navigate(['/']);
        return;
      }

      // Determine participant role label and other user ID
      this.participantRole = this.currentUser?.userType === 'tutor' ? 'Student' : 'Tutor';
      const otherUserId = this.currentUser?.id === this.session.tutorId ? this.session.studentId : this.session.tutorId;

      // Fetch other user profile image
      if (otherUserId) {
        const userResp: any = await firstValueFrom(this.http.post('http://127.0.0.1:3000/graphql', {
          query: `query GetUser($id: ID!) {
            user(id: $id) {
              id
              name
              email
              userType
              education
              gender
              age
              bio
              profileImageUrl
              timezone
              rating
              totalSessions
            }
          }`,
          variables: { id: otherUserId.toString() }
        }));

        if (userResp?.data?.user) {
          this.otherUserProfileUrl = userResp.data.user.profileImageUrl;
          // Pre-load the profile data to avoid needing to fetch it again when opening profile
          this.selectedProfile = userResp.data.user;
        }
      }

      // Load materials from the session (shared with both tutor & student)
      if (this.session?.materials) {
        this.materials = this.session.materials;
      }

      // Start the call after everything is loaded
      await this.startCall();

      // Set up WebSocket connection for signaling
      this.setupWebSocket();
    } catch (err) {
      console.error('Error in ngOnInit:', err);
      alert('Failed to initialize video call. Please try refreshing the page.');
    }
  }

  private async setupWebSocket() {
    const ws = new WebSocket('ws://localhost:3000/cable');
    
    ws.onopen = () => {
      // Subscribe to the session channel
      ws.send(JSON.stringify({
        command: 'subscribe',
        identifier: JSON.stringify({
          channel: 'MessagesChannel',
          session_id: this.sessionId
        })
      }));
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'ping') return;

      const message = data.message;
      if (!message) return;

      switch (message.type) {
        case 'user_joined':
          if (message.userId !== this.currentUser?.id) {
            this.remoteJoined = true;
            if (!this.hasSetupPeerConnection) {
              this.isInitiator = true;
              await this.setupPeerConnection();
              await this.createAndSendOffer();
            }
          }
          break;
        case 'offer':
          if (!this.hasSetupPeerConnection) {
            await this.setupPeerConnection();
          }
          await this.handleOffer(message.offer);
          break;
        case 'answer':
          await this.handleAnswer(message.answer);
          break;
        case 'ice_candidate':
          await this.handleIceCandidate(message.candidate);
          break;
      }
    };

    ws.onclose = () => {
      // console.log('WebSocket disconnected');
    };
  }

  private async setupPeerConnection() {
    if (this.hasSetupPeerConnection) return;

    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    };

    this.peerConnection = new RTCPeerConnection(configuration);
    this.hasSetupPeerConnection = true;

    // Add local tracks to the connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        if (this.localStream && this.peerConnection) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });
    }

    // Handle incoming tracks
    this.peerConnection.ontrack = (event) => {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;
        if (remoteVideo) {
          remoteVideo.srcObject = this.remoteStream;
        }
      }
      event.streams[0].getTracks().forEach(track => {
        if (this.remoteStream) {
          this.remoteStream.addTrack(track);
        }
      });
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendMessage({
          type: 'ice_candidate',
          candidate: event.candidate
        });
      }
    };
  }

  private async createAndSendOffer() {
    if (!this.peerConnection) return;

    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      this.sendMessage({
        type: 'offer',
        offer: offer
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }

  private async handleOffer(offer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.sendMessage({
        type: 'answer',
        answer: answer
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  private async handleIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  private sendMessage(message: any) {
    // Send message through WebSocket
    const ws = new WebSocket('ws://localhost:3000/cable');
    ws.onopen = () => {
      ws.send(JSON.stringify({
        command: 'message',
        identifier: JSON.stringify({
          channel: 'MessagesChannel',
          session_id: this.sessionId
        }),
        data: JSON.stringify({
          ...message,
          userId: this.currentUser?.id
        })
      }));
    };
  }

  private async startCall() {
    try {
      // Check if we already have permissions by checking if we can enumerate devices with labels
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasPermissions = devices.some(device => device.label !== '');

      if (!hasPermissions) {
        // Only request permissions if we don't already have them
        this.localStream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
      } else if (!this.localStream) {
        // If we have permissions but no stream, get the stream without triggering the permission dialog
        this.localStream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
      }

      // Show local preview
      const localVideo = document.getElementById('localVideo') as HTMLVideoElement;
      if (localVideo && this.localStream) {
        localVideo.srcObject = this.localStream;
        await localVideo.play().catch(err => {
          console.warn('Error playing local video:', err);
          // Don't show error to user as this might be expected in some cases
        });
      }

      // Set up remote video element
      this.remoteVideoElement = document.getElementById('remoteVideo') as HTMLVideoElement;
      if (this.remoteVideoElement) {
        this.remoteVideoElement.onloadedmetadata = () => {
          this.remoteVideoElement?.play().catch(err => {
            console.warn('Error playing remote video:', err);
          });
        };
      }

      // Monitor remote stream
      setInterval(() => this.monitorRemote(), 1000);

      // Start recording for transcription
      this.startRecording();

    } catch (err) {
      console.error('Error starting call:', err);
      // Only show permission error if it's actually a permission error
      if (err instanceof Error && err.name === 'NotAllowedError') {
        alert('Unable to access camera/microphone. Please grant permissions and try again.');
      }
    }
  }

  private monitorRemote() {
    if (!this.remoteVideoElement) return;
    
    const stream = this.remoteVideoElement.srcObject as MediaStream;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        this.remoteJoined = true;
        this.remoteCamOff = !videoTrack.enabled;
      }
    }
  }

  private remoteVideoElement: HTMLVideoElement | null = null;

  toggleMic() {
    if (!this.localStream) return;
    this.isMicMuted = !this.isMicMuted;
    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = !this.isMicMuted;
    });
  }

  toggleCam() {
    if (!this.localStream) return;
    this.isCamOff = !this.isCamOff;
    this.localStream.getVideoTracks().forEach(track => {
      track.enabled = !this.isCamOff;
    });
  }

  private startRecording() {
    if (!this.localStream) return;

    // We only need audio for transcript
    const audioTracks = this.localStream.getAudioTracks();
    const audioStream = new MediaStream(audioTracks);

    const options: MediaRecorderOptions = { mimeType: 'audio/webm' } as any;
    this.mediaRecorder = new MediaRecorder(audioStream, options);
    const chunks: Blob[] = [];

    this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    this.mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('file', blob, 'audio.webm');
      formData.append('sessionId', this.sessionId || '');
      try {
        await this.http.post('/api/transcripts/upload', formData).toPromise();
      } catch (err) {
        console.error('Failed to upload audio for transcription', err);
      }
    };

    this.mediaRecorder.start();
  }

  /* ---------- Sidebar (Materials) ---------- */
  selectMaterial(mat: Material) {
    this.selectedMaterial = mat;
  }

  backToMaterials() {
    this.selectedMaterial = null;
  }

  get otherUserName(): string {
    if (!this.session || !this.currentUser) return 'other participant';
    const isStudent = this.currentUser.email === this.session.studentEmail;
    return isStudent ? this.session.tutorName : this.session.studentName;
  }

  getFileType(resource: any): string {
    if (resource.contentType === 'application/pdf') return 'pdf';
    if (resource.contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
    return 'default';
  }

  getFileIcon(resource: any): string {
    // Use Noto Color Emoji font icons
    switch (resource.resourceType?.toLowerCase()) {
      case 'quiz':
        return '📝';
      case 'learning':
        return '📚';
      case 'worksheet':
        return '📋';
      default:
        if (resource.contentType === 'application/pdf') return '📄';
        if (resource.contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return '📑';
        return '📄';
    }
  }

  openProfile() {
    // Use the pre-loaded profile data
    if (this.selectedProfile) {
      this.showProfilePreview = true;
    }
  }

  closeProfilePreview() {
    this.showProfilePreview = false;
  }

  onMessageUser(user: TutorProfile) {
    this.chatPopup.open(user.id);
  }

  downloadResource(res: any) {
    if (!res.fileUrl) return;
    const link = document.createElement('a');
    link.href = res.fileUrl;
    link.download = res.fileName || res.name || 'resource';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  ngOnDestroy(): void {
    // Clean up WebRTC
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    // Stop recording and send audio
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // Stop all media tracks
    this.localStream?.getTracks().forEach(track => {
      track.stop();
    });
    this.remoteStream?.getTracks().forEach(track => {
      track.stop();
    });
  }
} 