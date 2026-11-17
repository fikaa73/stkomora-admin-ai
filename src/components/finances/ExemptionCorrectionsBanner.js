/**
 * Upozorenje u Finansijama: članovi kojima oslobođenje pokriva mjesece
 * koji su već zaduženi.
 *
 * Nastaje kad se rješenje o oslobođenju upiše kasnije nego što važi (npr.
 * doneseno u oktobru, važi od februara) — cron je te mjesece već zadužio, a
 * oslobođenje ne gleda unazad. Ovdje se vide svi takvi slučajevi na jednom
 * mjestu i poništavaju jednim klikom po članu.
 */
import React, { useState } from 'react';
import { Alert, Button, Modal, Table, Popconfirm, message, Typography } from 'antd';
import dayjs from 'dayjs';
import { usePendingCorrections, useClearExemptionCharges } from '../../hooks/useExemptions';
import { getApiErrorMessage } from '../../utils/apiError';

const { Text } = Typography;

function fmtPeriod(p) {
  if (!p) return '–';
  const d = dayjs(`${p}-01`);
  return d.isValid() ? d.format('MM.YYYY') : p;
}

function fmtAmount(v) {
  const n = Number(v);
  return isNaN(n) ? '0.00' : n.toFixed(2);
}

export default function ExemptionCorrectionsBanner() {
  const { data: rows = [], isLoading } = usePendingCorrections();
  const clearCharges = useClearExemptionCharges();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const handleClear = async (row) => {
    setBusyId(row.exemption_id);
    try {
      const { data } = await clearCharges.mutateAsync({
        memberId: row.user_id,
        id: row.exemption_id,
      });
      message.success(
        `${row.surname} ${row.name}: poništeno ${data.cleared} mj. (${fmtAmount(data.amount)} €)`
      );
    } catch (e) {
      message.error(getApiErrorMessage(e, 'Greška pri poništavanju zaduženja'));
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading || !rows.length) return null;

  const ukupno = rows.reduce((s, r) => s + Number(r.amount || 0), 0);

  const columns = [
    {
      title: 'Član',
      key: 'clan',
      render: (_, r) => `${r.surname || ''} ${r.name || ''}`.trim(),
    },
    {
      title: 'Oslobođen',
      key: 'period',
      render: (_, r) => `${fmtPeriod(r.start_period)} – ${fmtPeriod(r.end_period)}`,
    },
    {
      title: 'Zaduženih mjeseci',
      dataIndex: 'months',
      align: 'right',
      width: 150,
    },
    {
      title: 'Iznos',
      dataIndex: 'amount',
      align: 'right',
      width: 110,
      render: (v) => <Text type="danger">{fmtAmount(v)} €</Text>,
    },
    {
      title: '',
      key: 'akcija',
      width: 110,
      render: (_, r) => (
        <Popconfirm
          title="Poništiti zaduženja?"
          description={`${r.months} mj. članarine (${fmtAmount(r.amount)} €) ide na 0 €.`}
          okText="Poništi"
          cancelText="Odustani"
          onConfirm={() => handleClear(r)}
        >
          <Button size="small" danger loading={busyId === r.exemption_id}>
            Poništi
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <>
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 12 }}
        message={
          <span>
            {rows.length === 1
              ? 'Jedan član je oslobođen'
              : `${rows.length} članova je oslobođeno`}
            {' '}članarine za mjesece koji su već zaduženi — ukupno{' '}
            <b>{fmtAmount(ukupno)} €</b>.
          </span>
        }
        action={
          <Button size="small" onClick={() => setOpen(true)}>
            Pregledaj
          </Button>
        }
      />

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={<Button onClick={() => setOpen(false)}>Zatvori</Button>}
        width={760}
        title="Oslobođenja koja čekaju ispravku"
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          Rješenje je upisano poslije mjeseci na koje se odnosi, pa su ti mjeseci ostali
          zaduženi. Poništavanje stavlja članarinu na 0 € sa opisom „Članarina (oslobođen)";
          uplate i ručno unesene stavke ostaju netaknute.
        </Text>
        <Table
          style={{ marginTop: 12 }}
          rowKey="exemption_id"
          size="small"
          columns={columns}
          dataSource={rows}
          pagination={rows.length > 10 ? { pageSize: 10 } : false}
        />
      </Modal>
    </>
  );
}
