import React, { useState, useRef } from 'react';
import { Upload, Lock, FileText, ShieldCheck } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export function FileUpload({ onFileSelect }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.txt') || file.name.endsWith('.zip')) {
        onFileSelect(file);
      } else {
        alert('Please upload a .txt or .zip file exported from WhatsApp.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div 
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer
          ${isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".txt,.zip" 
          className="hidden" 
        />
        
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-emerald-100 rounded-full text-emerald-600">
            <Upload size={32} />
          </div>
        </div>
        
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Upload WhatsApp Chat</h3>
        <p className="text-gray-500 mb-6">
          Drag and drop your exported .txt or .zip file here, or click to browse.
        </p>
        
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
          <ShieldCheck size={16} />
          <span>Processed locally. 100% private.</span>
        </div>
      </div>
      
      <div className="mt-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
          <FileText size={18} className="text-blue-500" />
          How to export a chat?
        </h4>
        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
          <li>Open WhatsApp on your phone.</li>
          <li>Open the chat you want to export.</li>
          <li>Tap the contact's name or the three dots menu.</li>
          <li>Select <strong>Export Chat</strong>.</li>
          <li>Choose <strong>With Media</strong> or <strong>Without Media</strong>.</li>
          <li>Save the resulting .txt or .zip file and upload it here.</li>
        </ol>
      </div>
    </div>
  );
}
