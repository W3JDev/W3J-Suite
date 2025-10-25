
export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: {
      reviewSnippets: {
        uri: string;
        text: string;
      }[];
    }
  }
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  groundingChunks?: GroundingChunk[];
}
