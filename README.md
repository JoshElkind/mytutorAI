# MyTutor Platform

## Overview
MyTutor is a modern, full-stack tutoring platform designed to connect students and tutors for live, interactive learning sessions. The project is hosted on Azure and features a robust backend and a dynamic frontend, both built for scalability and ease of use.

## Features
- **Live Video Sessions:** Real-time video calls between students and tutors, with integrated chat and resource sharing.
- **Session History:** Students and tutors can review past sessions, feedback, and materials.
- **Materials Management:** Only materials assigned to a specific offering or lesson are available during a session.
- **Authentication:** OTP-based login for secure, passwordless access.
- **Payments:** Stripe integration enables merchant tutors to receive payments from students for lessons.
- **AI-Powered Tools:**
  - Utilizes LangChain, Chroma vector DB, and Retrieval-Augmented Generation (RAG) to generate quizzes for tutors based on their uploaded learning resources.
  - The same stack is used to transcribe video call audio to text and automatically identify key feedback points for students to improve on.
- **Caching:** APACHE Kafka, Elasticsearch, and Redis-backed caching for fast search and data retrieval (chat-logs, searching marketplace, session data).
  
## Tech Stack
- **Frontend:** Angular (standalone components, SCSS, RxJS)
- **Backend:** Ruby on Rails, GraphQL API, ActiveRecord, Redis, APACHE Kafka, Elasticsearch
- **Database:** MySQL (UUID primary keys, JSON columns)
- **AI/ML:** LangChain, Chroma vector DB, RAG
- **Payments:** Stripe
- **Hosting:** Azure


> Note: Backend and frontend are not currently hosted (taken down due to cost). For inquiries or access, please reach out to me.

## Demo Folder
All demo videos and walkthroughs are available at:
https://loom.com/share/folder/da3e97a27a884e93a8658cdd61855d53

## Demo Screenshots
<sub>homepage</sub>
![Alt text](photos-mytutor/1.png)

<sub>AI generated quiz resource for tutors</sub>
![Alt text](photos-mytutor/aitutor.png)

<sub>AI generated post-session student feedback</sub>
![Alt text](photos-mytutor/19.png)

<sub>purchase lessons</sub>
![Alt text](photos-mytutor/3.png)

<sub>upcoming sessions calender</sub>
![Alt text](photos-mytutor/4.png)

<sub>lesson marketplace</sub>
![Alt text](photos-mytutor/5.png)

<sub>tutoring video call</sub>
![Alt text](photos-mytutor/6.png)

<sub>viewing other users' profiles</sub>
![Alt text](photos-mytutor/profilenice.png)

<sub>user profile settings</sub>
![Alt text](photos-mytutor/8.png)

<sub>messenger chat feature</sub>
![Alt text](photos-mytutor/7.png)

<sub>stripe payment settings</sub>
![Alt text](photos-mytutor/01.png)

<sub>stripe payment methods</sub>
![Alt text](photos-mytutor/02.png)

<sub>stripe tutoring checkout</sub>
![Alt text](photos-mytutor/03.png)

<sub>tutor adding resource files</sub>
![Alt text](photos-mytutor/10.png)

<sub>AI Quiz Generation</sub>
![Alt text](photos-mytutor/11.png)

<sub>tutor resource file manager</sub>
![Alt text](photos-mytutor/12.png)

<sub>tutor scheduling class times</sub>
![Alt text](photos-mytutor/13.png)

<sub>tutor adding new lessons</sub>
![Alt text](photos-mytutor/14.png)

<sub>session history menu</sub>
![Alt text](photos-mytutor/16.png)

<sub>OTP user signup</sub>
![Alt text](photos-mytutor/20.png)

<sub>tutor lesson marketplace</sub>
![Alt text](photos-mytutor/21.png)

<sub>user guide page</sub>
![Alt text](photos-mytutor/23.png)

<sub>lesson purchasing menu</sub>
![Alt text](photos-mytutor/24.png)

<sub>user calender upcoming sessions</sub>
![Alt text](photos-mytutor/25.png)

<sub>selecting time slots to purchase</sub>
![Alt text](photos-mytutor/26.png)

<sub>user OTP signup types</sub>
![Alt text](photos-mytutor/40.png)

<sub>user OTP login</sub>
![Alt text](photos-mytutor/41.png)

<sub>main menu page</sub>
![Alt text](photos-mytutor/44.png)

<sub>blank chat menu</sub>
![Alt text](photos-mytutor/49.png)

## Contact
For questions, demo access, or collaboration opportunities, please reach out to me. 
