import { useState, useRef } from 'react';

export default function ImageUploader({ files, setFiles, existingFiles, setExistingFiles, maxFiles = 5 }) {
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
    const totalCount = (existingFiles?.length || 0) + files.length + validFiles.length;
    const allowedCount = maxFiles - (existingFiles?.length || 0) - files.length;
    
    if (allowedCount <= 0) return;
    const updated = [...files, ...validFiles.slice(0, allowedCount)];
    
    const filesWithPreview = updated.map(f => {
      if (!f.preview) f.preview = URL.createObjectURL(f);
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

  const removeExistingFile = (id, e) => {
    e.stopPropagation();
    setExistingFiles(existingFiles.filter(f => f.id !== id));
  };

  const totalCount = (existingFiles?.length || 0) + files.length;

  return (
    <div>
      <div 
        className={`dropzone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => totalCount < maxFiles && fileInputRef.current.click()}
        style={{ opacity: totalCount >= maxFiles ? 0.5 : 1, cursor: totalCount >= maxFiles ? 'not-allowed' : 'pointer' }}
      >
        <input 
          type="file" multiple accept="image/*" ref={fileInputRef} 
          onChange={handleFileChange} style={{ display: 'none' }} 
        />
        <div className="dropzone-icon">📸</div>
        <div className="dropzone-text">
          {totalCount >= maxFiles ? "Достигнут лимит файлов" : <>Перетащите скрины сюда или <span>нажмите для выбора</span></>}
        </div>
        <div className="dropzone-hint">Максимум {maxFiles} файлов, до 5 МБ</div>
      </div>

      {(files.length > 0 || existingFiles?.length > 0) && (
        <div className="preview-grid">
          {existingFiles?.map((f) => (
            <div key={`existing_${f.id}`} className="preview-item">
              <img src={`/uploads/thumb_${f.file_path}`} alt="preview" />
              <button type="button" className="preview-remove" onClick={(e) => removeExistingFile(f.id, e)}>✕</button>
            </div>
          ))}
          {files.map((file, i) => (
            <div key={`new_${i}`} className="preview-item">
              <img src={file.preview} alt="preview" />
              <button type="button" className="preview-remove" onClick={(e) => removeFile(i, e)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}