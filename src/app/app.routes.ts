import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/chat/chat-container/chat-container.component').then(
        (m) => m.ChatContainerComponent
      )
  },
  { path: '**', redirectTo: '' }
];
