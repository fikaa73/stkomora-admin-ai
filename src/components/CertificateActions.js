/**
 * View, Download, Print, Remove for a single certificate file (certificate_files).
 */
import React, { useState } from 'react';
import { Button, Space, Popconfirm, message } from 'antd';
import { EyeOutlined, DownloadOutlined, PrinterOutlined, DeleteOutlined } from '@ant-design/icons';
import { certificatesApi } from '../core/api/certificates';

export default function CertificateActions({
  certificateId,
  fileRecord,
  onRemoved,
  showRemove = false,
}) {
  const [loading, setLoading] = useState(null);

  const handleView = async () => {
    setLoading('view');
    try {
      const blob = await certificatesApi.fetchFileBlob(certificateId, fileRecord.id, 'inline');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      message.error(e?.message || 'Greška pri pregledu');
    } finally {
      setLoading(null);
    }
  };

  const handleDownload = async () => {
    setLoading('download');
    try {
      const blob = await certificatesApi.fetchFileBlob(certificateId, fileRecord.id, 'attachment');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileRecord.file?.split('/').pop() || `sertifikat-${fileRecord.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      message.error(e?.message || 'Greška pri preuzimanju');
    } finally {
      setLoading(null);
    }
  };

  const handlePrint = async () => {
    setLoading('print');
    try {
      const blob = await certificatesApi.fetchFileBlob(certificateId, fileRecord.id, 'inline');
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          printWindow.onafterprint = () => printWindow.close();
        };
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      message.error(e?.message || 'Greška pri štampi');
    } finally {
      setLoading(null);
    }
  };

  const handleRemove = async () => {
    setLoading('remove');
    try {
      await certificatesApi.removeFile(certificateId, fileRecord.id);
      message.success('Sertifikat je obrisan');
      onRemoved?.();
    } catch (e) {
      message.error(e?.message || 'Greška pri brisanju');
    } finally {
      setLoading(null);
    }
  };

  const hasFile = !!fileRecord.file;
  const displayTitle =
    fileRecord.event_name?.trim() ||
    fileRecord.title?.trim() ||
    fileRecord.file?.split('/').pop() ||
    `Sertifikat #${fileRecord.id}`;
  const fileName = fileRecord.file?.split('/').pop() || 'dokument';
  const points = fileRecord.points != null && fileRecord.points !== '' ? fileRecord.points : null;

  return (
    <div
      style={{
        padding: '12px 14px',
        background: '#fafafa',
        borderRadius: 8,
        marginBottom: 10,
        border: '1px solid #e8e8e8',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 14, color: '#262626', marginBottom: 4, lineHeight: 1.4 }}>
        {displayTitle}
      </div>
      {points != null && (
        <div style={{ fontSize: 12, color: '#0a3851', fontWeight: 600, marginBottom: 8 }}>
          Broj bodova: {points}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 12, color: '#8c8c8c' }} title={fileName}>
          {hasFile ? `Fajl: ${fileName}` : 'Evidencija bez sertifikata'}
        </span>
        <Space size="small" wrap>
          {hasFile && (
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={handleView}
              loading={loading === 'view'}
            >
              Pregled
            </Button>
          )}
          {hasFile && (
            <Button
              type="link"
              size="small"
              icon={<DownloadOutlined />}
              onClick={handleDownload}
              loading={loading === 'download'}
            >
              Preuzmi
            </Button>
          )}
          {hasFile && (
            <Button
              type="link"
              size="small"
              icon={<PrinterOutlined />}
              onClick={handlePrint}
              loading={loading === 'print'}
            >
              Štampaj
            </Button>
          )}
          {showRemove && (
            <Popconfirm
              title="Obriši sertifikat?"
              onConfirm={handleRemove}
              okText="Da"
              cancelText="Ne"
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={loading === 'remove'}
              >
                Obriši
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>
    </div>
  );
}
