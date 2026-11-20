/**
 * Oslobođenje od plaćanja članarine – prikaz + unos (u finansijskoj kartici člana).
 * Checkbox "Oslobađa se" -> broj mjeseci + početni mjesec + PDF rješenja.
 * Za pokrivene mjesece mjesečni cron obračunava članarinu = 0.
 */
import React, { useState } from 'react';
import {
  Card, Checkbox, DatePicker, InputNumber, Upload, Button, Input,
  Space, Tag, Typography, message, Popconfirm, List, Tooltip, Alert, Modal,
} from 'antd';
import {
  UploadOutlined, EyeOutlined, DeleteOutlined, FilePdfOutlined, EditOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  useMemberExemptions, useAddExemption, useUpdateExemption, useDeleteExemption,
  useClearExemptionCharges,
} from '../../hooks/useExemptions';
import { exemptionsApi } from '../../core/api/exemptions';
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

export default function ExemptionSection({ memberId }) {
  const { data: exemptions = [], isLoading } = useMemberExemptions(memberId);
  const addExemption = useAddExemption();
  const updateExemption = useUpdateExemption();
  const deleteExemption = useDeleteExemption();
  const clearCharges = useClearExemptionCharges();
  const [clearingId, setClearingId] = useState(null);

  const [checked, setChecked] = useState(false);
  const [startMonth, setStartMonth] = useState(dayjs());
  const [months, setMonths] = useState(1);
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [viewLoading, setViewLoading] = useState(null);
  // Kad se mijenja postojeće oslobođenje, ista forma radi u režimu izmjene.
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

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
    setEditingId(null);
  };

  const startEdit = (ex) => {
    setEditingId(ex.id);
    setChecked(true);
    setStartMonth(dayjs(`${ex.start_period}-01`));
    setMonths(ex.months);
    setNote(ex.note || '');
    setFile(null);
  };

  /** Rečenica tipa „9 mjeseci ide na 0,00 € (90.00 €)". */
  const opisPrimjene = (apply) => {
    if (!apply) return null;
    const d = [];
    if (apply.months > 0) {
      d.push(`${apply.months} mj. članarine ide na 0,00 € (ukupno ${fmtAmount(apply.amount)} €)`);
    }
    if (apply.to_create > 0) {
      d.push(`${apply.to_create} mj. bez stavke dobija novu stavku od 0,00 €`);
    }
    return d.length ? d : null;
  };

  /**
   * Snimanje uvijek prvo pokaže šta mijenja na kartici. Automatika smije da
   * ukine drugi klik, ali ne i uvid — pogrešno unesen period (60 umjesto 6
   * mjeseci) ne smije neprimijetno izmijeniti karticu.
   */
  const handleSave = async () => {
    if (!months || months < 1) {
      message.error('Unesite broj mjeseci (najmanje 1)');
      return;
    }
    if (!startMonth) {
      message.error('Izaberite početni mjesec');
      return;
    }

    const payload = {
      start_period: startMonth.format('YYYY-MM'),
      months,
      note,
      document: file,
    };

    setSaving(true);
    let pregled = null;
    try {
      const { data } = await exemptionsApi.preview(memberId, {
        start_period: payload.start_period,
        months: payload.months,
        exemption_id: editingId || undefined,
      });
      pregled = data;
    } catch (e) {
      setSaving(false);
      message.error(getApiErrorMessage(e, 'Greška pri provjeri izmjena'));
      return;
    }
    setSaving(false);

    const primjena = opisPrimjene(pregled && pregled.apply);
    const vracanje = pregled && pregled.restore && pregled.restore.months > 0
      ? `${pregled.restore.months} mj. izlazi iz oslobođenja i vraća se na redovnu članarinu `
        + `(ukupno ${fmtAmount(pregled.restore.amount)} €)`
      : null;

    const sacuvaj = async () => {
      try {
        const { data } = editingId
          ? await updateExemption.mutateAsync({ memberId, id: editingId, payload })
          : await addExemption.mutateAsync({ memberId, payload });

        const p = data && data.applied;
        const r = data && data.restored;
        const djelovi = [];
        if (p && p.cleared) djelovi.push(`poništeno ${p.cleared} mj.`);
        if (p && p.created) djelovi.push(`dodato ${p.created} mj. na 0,00 €`);
        if (r && r.restored) djelovi.push(`vraćeno ${r.restored} mj. na 10,00 €`);

        message.success(
          djelovi.length
            ? `Oslobođenje je sačuvano — ${djelovi.join(', ')}`
            : 'Oslobođenje je sačuvano'
        );
        resetForm();
      } catch (e) {
        message.error(getApiErrorMessage(e, 'Greška pri čuvanju oslobođenja'));
      }
    };

    if (!primjena && !vracanje) {
      await sacuvaj();
      return;
    }

    Modal.confirm({
      title: editingId ? 'Izmijeniti oslobođenje?' : 'Sačuvati oslobođenje?',
      width: 520,
      okText: 'Potvrdi',
      cancelText: 'Odustani',
      content: (
        <div>
          <div style={{ marginBottom: 8 }}>
            Period: <b>{startMonth.format('MM.YYYY')}</b> — {months} mj.
          </div>
          <ul style={{ paddingLeft: 18, marginBottom: 8 }}>
            {(primjena || []).map((t) => <li key={t}>{t}</li>)}
            {vracanje && <li>{vracanje}</li>}
          </ul>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Uplate, početno stanje i ostale stavke se ne diraju. Svaka izmjena se bilježi.
          </Text>
        </div>
      ),
      onOk: sacuvaj,
    });
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

  /**
   * Oslobođenje koje počinje u prošlosti ne dira mjesece koji su već zaduženi —
   * cron ih je napravio prije nego je oslobođenje upisano. Ovo ih poništava.
   */
  const handleClearCharges = async (ex) => {
    setClearingId(ex.id);
    try {
      const { data } = await clearCharges.mutateAsync({ memberId, id: ex.id });
      message.success(
        `Poništeno ${data.cleared} mj. članarine (${fmtAmount(data.amount)} €)`
      );
    } catch (e) {
      message.error(getApiErrorMessage(e, 'Greška pri poništavanju zaduženja'));
    } finally {
      setClearingId(null);
    }
  };

  const handleDelete = async (ex) => {
    try {
      const { data } = await deleteExemption.mutateAsync({ memberId, id: ex.id });
      const vraceno = data && data.restored ? data.restored.restored : 0;
      message.success(
        vraceno
          ? `Oslobođenje je obrisano — ${vraceno} mj. vraćeno na redovnu članarinu`
          : 'Oslobođenje je obrisano'
      );
      if (editingId === ex.id) resetForm();
    } catch (e) {
      message.error(getApiErrorMessage(e, 'Greška pri brisanju'));
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
      {/*
        Oslobođenje koje počinje u prošlosti ne dira mjesece koje je cron već
        zadužio. Upozorenje stoji na vrhu kartice (puna širina) jer je u uskom
        redu liste tekst neupotrebljiv.
      */}
      {(exemptions || [])
        .filter((ex) => ex.charged && ex.charged.months > 0)
        .map((ex) => (
          <Alert
            key={`zad-${ex.id}`}
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message={
              <span>
                {ex.charged.months === 1
                  ? 'Jedan mjesec je već zadužen'
                  : `${ex.charged.months} mjeseci je već zaduženo`}
                {' '}— ukupno <b>{fmtAmount(ex.charged.amount)} €</b>
              </span>
            }
            description={
              <div>
                <div style={{ fontSize: 12, marginBottom: 8 }}>
                  Oslobođenje {fmtPeriod(ex.start_period)} – {fmtPeriod(ex.end_period)} unijeto je
                  prije nego što je sistem počeo sam da usklađuje zaduženja. Jedan klik i to se
                  poravnava.
                </div>
                <Popconfirm
                  title="Poništiti već nastala zaduženja?"
                  description={
                    <div style={{ maxWidth: 300 }}>
                      {ex.charged.months} mj. članarine ({fmtAmount(ex.charged.amount)} €) ide na
                      0 € sa opisom „Članarina (oslobođen)". Uplate i ručno unesene stavke
                      ostaju netaknute.
                    </div>
                  }
                  okText="Poništi"
                  cancelText="Odustani"
                  onConfirm={() => handleClearCharges(ex)}
                >
                  <Button size="small" danger loading={clearingId === ex.id}>
                    Poništi već zaduženo
                  </Button>
                </Popconfirm>
              </div>
            }
          />
        ))}

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
            <Space>
              <Button
                type="primary"
                onClick={handleSave}
                loading={saving || addExemption.isPending || updateExemption.isPending}
              >
                {editingId ? 'Sačuvaj izmjenu' : 'Sačuvaj oslobođenje'}
              </Button>
              {editingId && <Button onClick={resetForm}>Odustani</Button>}
            </Space>
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
                  <Tooltip title="Izmijeni period" key="edit">
                    <Button
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => startEdit(ex)}
                    />
                  </Tooltip>,
                  <Popconfirm
                    key="del"
                    title="Obrisati oslobođenje?"
                    description={
                      <div style={{ maxWidth: 320 }}>
                        {ex.restorable && ex.restorable.months > 0 ? (
                          <>
                            {ex.restorable.months} mj. se vraća na redovnu članarinu
                            {' '}(<b>{fmtAmount(ex.restorable.amount)} €</b>), jer osnov za
                            oslobođenje više ne postoji.
                          </>
                        ) : (
                          'Nijedan mjesec se neće promijeniti.'
                        )}
                      </div>
                    }
                    okText="Obriši"
                    cancelText="Odustani"
                    onConfirm={() => handleDelete(ex)}
                  >
                    <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>,
                ]}
              >
                <div style={{ width: '100%' }}>
                  <Space size="small" wrap>
                    {ex.document && <FilePdfOutlined style={{ color: '#cf1322' }} />}
                    <Text>
                      {fmtPeriod(ex.start_period)} – {fmtPeriod(ex.end_period)} ({ex.months} mj.)
                    </Text>
                    {isActive && <Tag color="orange">aktivno</Tag>}
                    {ex.note && <Text type="secondary" style={{ fontSize: 12 }}>{ex.note}</Text>}
                  </Space>

                </div>
              </List.Item>
            );
          }}
        />
      </div>
    </Card>
  );
}
