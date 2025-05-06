import styles from '../styles/RoomPage.module.css';
import { FaTimes } from 'react-icons/fa';
import React from 'react';

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
          <button className={styles.btnClose} onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}