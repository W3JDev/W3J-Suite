import React from 'react';

export const ConstellationLoader: React.FC = () => (
    <div className="constellation-loader">
        <div className="node"></div><div className="node"></div><div className="node"></div>
        <div className="node"></div><div className="node"></div><div className="node"></div>
        <svg>
            <line className="line" x1="50%" y1="10%" x2="20%" y2="30%" strokeDasharray="5, 5"></line>
            <line className="line" x1="50%" y1="10%" x2="80%" y2="30%" strokeDasharray="5, 5" style={{animationDelay: '-0.5s'}}></line>
            <line className="line" x1="20%" y1="30%" x2="70%" y2="70%" strokeDasharray="5, 5" style={{animationDelay: '-1s'}}></line>
            <line className="line" x1="80%" y1="30%" x2="30%" y2="70%" strokeDasharray="5, 5" style={{animationDelay: '-1.5s'}}></line>
            <line className="line" x1="30%" y1="70%" x2="50%" y2="90%" strokeDasharray="5, 5" style={{animationDelay: '-2s'}}></line>
            <line className="line" x1="70%" y1="70%" x2="50%" y2="90%" strokeDasharray="5, 5" style={{animationDelay: '-2.5s'}}></line>
        </svg>
    </div>
);
