/**
 * Oslobođenje od plaćanja članarine – prikaz + unos (u finansijskoj kartici člana).
 * Checkbox "Oslobađa se" -> broj mjeseci + početni mjesec + PDF rješenja.
 * Za pokrivene mjesece mjesečni cron obračunava članarinu = 0.
 */
import React, { useState } from 'react';
import {
  Card, Checkbox, DatePicker, InputNumber, Upload, Button, Input,
  Space, Tag, Typography, message, Popconfirm, List, Tooltip,
} from 'antd';
import { UploadOutlined, EyeOutlined, DeleteOutlined, FilePdfOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useMemberExemptions, useAddExemption, useDeleteExemption } from '../../hooks/useExemptions';
import { exemptionsApi } from '../../core/api/exemptions';

const { Text } = Typography;

function fmtPeriod(p) {
  if (!p) return '–';
  const d = dayjs(`${p}-01`);
  return d.isValid() ? d.format('MM.YYYY') : p;
}

export default function ExemptionSection({ memberId }) {
  const { data: exemptions = [], isLoading } = useMemberExemptions(memberId);
  const addExemption = useAddExemption();
  const deleteExemption = useDeleteExemption();

  const [checked, setChecked] = useState(false);
  const [startMonth, setStartMonth] = useState(dayjs());
  const [months, setMonths] = useState(1);
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [viewLoading, setViewLoading] = useState(null);

  const currentPeriod = dayjs().format('YYYY-MM');
  const activeExemption = (exemptions || []).find(
    (e) => e.start_period <= currentPeriod && currentPeriod <= e.end_period
  );

  const resetForm = () => {
    setChecked(false);
    setStartMonth(dayjs());
    setMonths(1);
    setNote('');
    setFile(null);
  };

  const handleSave = async () => {
    if (!months || months < 1) {
      message.error('Unesite broj mjeseci (najmanje 1)');
      return;
    }
    if (!startMonth) {
      message.error('Izaberite početni mjesec');
      return;
    }
    try {
      await addExemption.mutateAsync({
        memberId,
        payload: {
          start_period: startMonth.format('YYYY-MM'),
          months,
          note,
          document: file,
        },
      });
      message.success('Oslobođenje je sačuvano');
      resetForm();
    } catch (e) {
      const msg = e?.response?.data?.message;
      const flat = msg && typeof msg === 'object' ? Object.values(msg)[0]?.[0] : msg;
      message.error(flat || 'Greška pri čuvanju oslobođenja');
    }
  };

  const handleView = async (ex) => {
    if (!ex.document) return;
    setViewLoading(ex.id);
    try {
      const blob = await exemptionsApi.fetchDocumentBlob(memberId, ex.id, 'inline');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      message.error('Greška pri otvaranju rješenja');
    } finally {
      setViewLoading(null);
    }
  };

  const handleDelete = async (ex) => {
    try {
      await deleteExemption.mutateAsync({ memberId, id: ex.id });
      message.success('Oslobođenje je obrisano');
    } catch (e) {
      message.error('Greška pri brisanju');
    }
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          <span>Oslobođenje od članarine</span>
          {activeExemption ? (
            <Tag color="orange">Oslobođen do {fmtPeriod(activeExemption.end_period)}</Tag>
          ) : (
            <Tag color="green">Plaća članarinu</Tag>
          )}
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)}>
        Oslobađa se plaćanja članarine
      </Checkbox>

      {checked && (
        <div style={{ marginTop: 12 }}>
          <Space wrap align="start" size="middle">
            <div>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>Početni mjesec</div>
              <DatePicker
                picker="month"
                value={startMonth}
                onChange={setStartMonth}
                format="MM.YYYY"
                allowClear={false}
                style={{ width: 140 }}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>Broj mjeseci</div>
              <InputNumber min={1} max={600} value={months} onChange={setMonths} style={{ width: 110 }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>PDF rješenja (opciono)</div>
              <Upload
                accept=".pdf"
                maxCount={1}
                beforeUpload={(f) => {
                  if (f.type !== 'application/pdf') {
                    message.error('Samo PDF je dozvoljen.');
                    return Upload.LIST_IGNORE;
                  }
                  setFile(f);
                  return false;
                }}
                onRemove={() => setFile(null)}
                fileList={file ? [{ uid: '-1', name: file.name }] : []}
              >
                <Button icon={<UploadOutlined />}>Priloži PDF</Button>
              </Upload>
            </div>
          </Space>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>Napomena (opciono)</div>
            <Input.TextArea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="npr. broj i datum rješenja"
              maxLength={512}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <Button type="primary" onClick={handleSave} loading={addExemption.isPending}>
              Sačuvaj oslobođenje
            </Button>
            <Text type="secondary" style={{ marginLeft: 10, fontSize: 12 }}>
              Za {months || 0} mj. od {startMonth ? startMonth.format('MM.YYYY') : '–'} članarina = 0
            </Text>
          </div>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>Evidentirana oslobođenja</Text>
        <List
          size="small"
          loading={isLoading}
          dataSource={exemptions || []}
          locale={{ emptyText: 'Nema oslobođenja' }}
          renderItem={(ex) => {
            const isActive = ex.start_period <= currentPeriod && currentPeriod <= ex.end_period;
            return (
              <List.Item
                actions={[
                  ex.document ? (
                    <Tooltip title="Pregled rješenja (PDF)" key="view">
                      <Button
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        loading={viewLoading === ex.id}
                        onClick={() => handleView(ex)}
                      />
                    </Tooltip>
                  ) : (
                    <Text key="nofile" type="secondary" style={{ fontSize: 12 }}>bez PDF-a</Text>
                  ),
                  <Popconfirm
                    key="del"
                    title="Obrisati oslobođenje?"
                    okText="Da"
                    cancelText="Ne"
                    onConfirm={() => handleDelete(ex)}
                  >
                    <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>,
                ]}
              >
                <Space size="small" wrap>
                  {ex.document && <FilePdfOutlined style={{ color: '#cf1322' }} />}
                  <Text>
                    {fmtPeriod(ex.start_period)} – {fmtPeriod(ex.end_period)} ({ex.months} mj.)
                  </Text>
                  {isActive && <Tag color="orange">aktivno</Tag>}
                  {ex.note && <Text type="secondary" style={{ fontSize: 12 }}>{ex.note}</Text>}
                </Space>
              </List.Item>
            );
          }}
        />
      </div>
    </Card>
  );
}
