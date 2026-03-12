import { Component } from '@angular/core';

type PostType = 'article' | 'video';

type Post = {
  id: string;
  title: string;
  summary: string;
  thumbnailUrl: string;
  type: PostType;
  youtubeUrl?: string;
};

@Component({
  selector: 'app-content',
  standalone: true,
  imports: [],
  templateUrl: './content.html',
  styleUrl: './content.css',
})
export class Content {
  posts: Post[] = [
    {
      id: 'wow-reset-checklist',
      title: 'WoW Weekly Reset Checklist (No-Life Edition)',
      summary: 'A practical weekly loop so you don’t log in, stare into the void, and log out.',
      thumbnailUrl: 'https://via.placeholder.com/320x180?text=WoW',
      type: 'article',
    },
    {
      id: 'warframe-returning-player',
      title: 'Warframe: Returning Player Quickstart (2026)',
      summary: 'What to do first so you don’t get crushed by 400 systems at once.',
      thumbnailUrl: 'https://via.placeholder.com/320x180?text=Warframe',
      type: 'article',
    },
    {
      id: 'video-build-philosophy',
      title: 'Build Philosophy: Why “fun” beats “meta” (most of the time)',
      summary: 'A short video rant about optimization, identity, and not becoming a spreadsheet.',
      thumbnailUrl: 'https://via.placeholder.com/320x180?text=Video',
      type: 'video',
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    },
  ];
}