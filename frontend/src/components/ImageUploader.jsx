import { useState, useRef } from 'react';

export default function ImageUploader({ files, setFiles, maxFiles = 5 }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
    e.target.value = null;
  };

  const addFiles = (newFiles) => {
    const validFiles = newFiles.filter(f => f.type.startsWith('image/'));
    const updated = [...files, ...validFiles].slice(0, maxFiles);
    
    // Генерируем локальные URL для превью
    const filesWithPreview = updated.map(f => {
      if (!f.preview) {
        f.preview = URL.createObjectURL(f);
      }
      return f;
    });
    setFiles(filesWithPreview);
  };

  const removeFile = (index, e) => {
    e.stopPropagation();
    const fileToRemove = files[index];
    if (fileToRemove.preview) URL.revokeObjectURL(fileToRemove.preview);
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div 
        className={`dropzone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
      >
        <input 
          type="file" 
          multiple 
          accept="image/*" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          style={{ display: 'none' }} 
        />
        <div className="dropzone-icon">📸</div>
        <div className="dropzone-text">
          Перетащите скрины сюда или <span>нажмите для выбора</span>
        </div>
        <div className="dropzone-hint">Максимум {maxFiles} файлов, до 5 МБ каждый</div>
      </div>

      {files.length > 0 && (
        <div className="preview-grid">
          {files.map((file, i) => (
            <div key={i} className="preview-item">
              <img src={file.preview} alt="preview" />
              <button type="button" className="preview-remove" onClick={(e) => removeFile(i, e)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}