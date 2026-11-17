"use client";

import { AnimatePresence, motion } from "motion/react";
import { SearchSelect } from "@/components/forms/search-select";
import { PhoneInput } from "@/components/forms/phone-input";
import { FREE_TEXT_MAX, labelOf } from "@/data/attendee-form";
import { VOLUNTEER_TEXT_MAX } from "@/data/volunteer-form";
import { normalizeDocument, normalizeEmail } from "@/lib/normalize";
import { cn } from "@/lib/utils";
import type { Formulario } from "./_use-form";
import { Row, Field, inputCls } from "@/components/forms/campos";

export function BloquePersona({ f }: { f: Formulario }) {
  const { locale, t, v, errors, setErrors, set, docTypes, entities, roleOptions, entityOptions, sbgOptions, docRule, docExample, needsRoleOther, needsEntityName, needsSbgOther } = f;
  return (
    <>
      {/* ── Quién eres ── */}
      <Row>
        <Field label={t.firstName} required htmlFor="v-name" error={errors.firstName}>
          <input
            id="v-name"
            name="given-name"
            autoComplete="given-name"
            value={v.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            placeholder={t.firstName_ph}
            maxLength={60}
            aria-invalid={errors.firstName ? true : undefined}
            className={cn(inputCls, errors.firstName && "border-error")}
          />
        </Field>
        <Field label={t.lastName} required htmlFor="v-last" error={errors.lastName}>
          <input
            id="v-last"
            name="family-name"
            autoComplete="family-name"
            value={v.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            placeholder={t.lastName_ph}
            maxLength={60}
            aria-invalid={errors.lastName ? true : undefined}
            className={cn(inputCls, errors.lastName && "border-error")}
          />
        </Field>
      </Row>

      <Field
        label={t.email}
        required
        htmlFor="v-mail"
        error={errors.email}
        hint={t.email_hint}
      >
        <input
          id="v-mail"
          name="email"
          autoComplete="email"
          type="email"
          inputMode="email"
          value={v.email}
          onChange={(e) => set("email", e.target.value)}
          onBlur={() => {
            if (!v.email.trim()) return;
            const r = normalizeEmail(v.email);
            setErrors((x) => ({ ...x, email: r.ok ? undefined : r.reason }));
          }}
          placeholder={t.email_ph}
          aria-invalid={errors.email ? true : undefined}
          className={cn(inputCls, errors.email && "border-error")}
        />
      </Field>

      {/* El teléfono va con indicativo, como en el formulario de speakers:
          el campo libre dejaba entrar cualquier formato y después nadie
          sabía si "912345678" llevaba +56 o no. */}
      <PhoneInput
        label={t.phone}
        required
        countryCode={v.phoneCountry}
        onCountryChange={(code) => set("phoneCountry", code)}
        value={v.phone}
        onChange={(local) => set("phone", local)}
        error={errors.phone}
      />

      <Row>
        <Field label={t.docType} required htmlFor="v-doct" error={errors.documentType}>
          <SearchSelect
            id="v-doct"
            options={docTypes.map((d) => ({ value: d.value, label: labelOf(d, locale) }))}
            value={v.documentType}
            onChange={(val) => set("documentType", val)}
            placeholder={t.select}
            searchPlaceholder={t.searchType}
            invalid={!!errors.documentType}
          />
        </Field>
        <Field
          label={t.docNumber}
          required
          htmlFor="v-docn"
          error={errors.documentNumber}
          hint={t.docNumber_hint}
        >
          <input
            id="v-docn"
            name="documento"
            autoComplete="off"
            value={v.documentNumber}
            onChange={(e) => set("documentNumber", e.target.value)}
            onBlur={() => {
              if (!docRule || !v.documentNumber.trim()) return;
              const r = normalizeDocument(v.documentNumber, docRule);
              setErrors((x) => ({ ...x, documentNumber: r.ok ? undefined : r.reason }));
              if (r.ok) set("documentNumber", r.value);
            }}
            disabled={!v.documentType}
            placeholder={docExample ?? ""}
            maxLength={24}
            aria-invalid={errors.documentNumber ? true : undefined}
            className={cn(
              inputCls,
              errors.documentNumber && "border-error",
              !v.documentType && "cursor-not-allowed opacity-50",
            )}
          />
        </Field>
      </Row>

      {/* ── De dónde vienes ── */}
      <Field label={t.role} required htmlFor="v-role" error={errors.role}>
        <SearchSelect
          id="v-role"
          options={roleOptions}
          value={v.role}
          onChange={(val) => set("role", val)}
          placeholder={t.role_ph}
          searchPlaceholder={t.searchRole}
          invalid={!!errors.role}
        />
      </Field>

      <AnimatePresence initial={false}>
        {needsRoleOther && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Field label={t.which} required htmlFor="v-roleo" error={errors.roleOther}>
              <input
                id="v-roleo"
                name="rol-otro"
                autoComplete="off"
                value={v.roleOther}
                onChange={(e) => set("roleOther", e.target.value)}
                placeholder={t.which_ph}
                maxLength={FREE_TEXT_MAX}
                aria-invalid={errors.roleOther ? true : undefined}
                className={cn(inputCls, errors.roleOther && "border-error")}
              />
            </Field>
          </motion.div>
        )}
      </AnimatePresence>

      <Field label={t.entity} required htmlFor="v-ent" error={errors.entityType}>
        <SearchSelect
          id="v-ent"
          options={entityOptions}
          value={v.entityType}
          onChange={(val) => set("entityType", val)}
          placeholder={t.entity_ph}
          searchPlaceholder={t.search}
          invalid={!!errors.entityType}
        />
      </Field>

      <AnimatePresence initial={false}>
        {needsEntityName && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Field
              label={`Nombre de tu ${entities.find((x) => x.value === v.entityType)?.label.toLowerCase() ?? "entidad"}`}
              required
              htmlFor="v-entn"
              error={errors.entityName}
            >
              <input
                id="v-entn"
                name="organization"
                autoComplete="organization"
                value={v.entityName}
                onChange={(e) => set("entityName", e.target.value)}
                placeholder={t.entityName_ph}
                maxLength={FREE_TEXT_MAX}
                aria-invalid={errors.entityName ? true : undefined}
                className={cn(inputCls, errors.entityName && "border-error")}
              />
            </Field>
          </motion.div>
        )}
      </AnimatePresence>

      <Field
        label={t.sbg}
        required
        htmlFor="v-sbg"
        error={errors.sbg}
      >
        <SearchSelect
          id="v-sbg"
          options={sbgOptions}
          value={v.sbg}
          onChange={(val) => set("sbg", val)}
          placeholder={t.select}
          searchPlaceholder={t.searchSbg}
          invalid={!!errors.sbg}
        />
      </Field>

      <AnimatePresence initial={false}>
        {needsSbgOther && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Field label={t.which} required htmlFor="v-sbgo" error={errors.sbgOther}>
              <input
                id="v-sbgo"
                name="grupo-otro"
                autoComplete="off"
                value={v.sbgOther}
                onChange={(e) => set("sbgOther", e.target.value)}
                placeholder={t.sbgOther_ph}
                maxLength={VOLUNTEER_TEXT_MAX}
                aria-invalid={errors.sbgOther ? true : undefined}
                className={cn(inputCls, errors.sbgOther && "border-error")}
              />
            </Field>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}
