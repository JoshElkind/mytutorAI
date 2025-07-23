import { Routes } from '@angular/router';
import { HomeComponent } from './home/home';
import { LessonsComponent } from './lessons/lessons';
import { ResourcesComponent } from './resources/resources';
import { AppearanceComponent } from './appearance/appearance';
import { CalendarComponent } from './calendar/calendar';
import { OfferingsComponent } from './offerings/offerings';
import { ExploreComponent } from './explore/explore';
import { VideoCallComponent } from './video-call/video-call';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'lessons', component: LessonsComponent },
  { path: 'resources', component: ResourcesComponent },
  { path: 'appearance', component: AppearanceComponent },
  { path: 'calendar', component: CalendarComponent },
  { path: 'offerings', component: OfferingsComponent },
  { path: 'explore', component: ExploreComponent },
  { path: 'call/:sessionId', component: VideoCallComponent, data: { prerender: false } },
  { path: 'offering/:id', loadComponent: () => import('./lesson-detail/lesson-detail').then(m => m.LessonDetailComponent), data: { prerender: false } },
  { path: 'past', loadComponent: () => import('./session-history').then(m => m.SessionHistory) },
  { path: 'help', loadComponent: () => import('./help/help.component').then(m => m.HelpComponent) },
];
