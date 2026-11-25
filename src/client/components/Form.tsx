import React, { createContext, useContext, useId } from 'react';
import { Tooltip } from './Tooltip';
interface FieldContext {
  id: string;
  descriptionId?: string;
  invalid: boolean;
}
const FormItemContext = createContext<FieldContext | null>(null);
type FormItemProps = {
  label: string;
  grouped?: boolean;
  layout?: 'vertical' | 'inline';
  hideLabel?: boolean;
  help?: string;
  tooltip?: string;
  warning?: string;
  error?: string;
  children: React.ReactNode;
};
/** 一个表单项对应一个控件；统一标签、说明、错误和可访问性关联。 */
export function FormItem(props: FormItemProps) {
  const id = useId();
  const message = props.error || props.warning || props.help;
  const descriptionId = message ? `${id}-description` : undefined;
  const messageClassName = props.error
    ? 'dpr-form-message dpr-error'
    : props.warning
      ? 'dpr-form-message dpr-warning'
      : 'dpr-form-message';
  return (
    <FormItemContext.Provider value={{ id, descriptionId, invalid: Boolean(props.error) }}>
      <div className={`dpr-form-item${props.layout === 'inline' ? ' dpr-form-item-inline' : ''}`}>
        <div className={props.hideLabel ? 'dpr-visually-hidden' : 'dpr-form-label-row'}>
          {props.grouped ? (
            <span className="dpr-label" id={`${id}-label`}>
              {props.label}
            </span>
          ) : (
            <label className="dpr-label" htmlFor={id}>
              {props.label}
            </label>
          )}
          {props.tooltip && <Tooltip label={`${props.label}说明`} content={props.tooltip} />}
        </div>
        {props.children}
        {descriptionId && (
          <p
            id={descriptionId}
            className={messageClassName}
            role={props.error ? 'alert' : undefined}
          >
            {message}
          </p>
        )}
      </div>
    </FormItemContext.Provider>
  );
}
/** 禁止网格拉伸表单项：帮助文字换行不应改变相邻输入框的高度。 */
export function FormGrid(props: FormGridProps) {
  return <div className="dpr-form-grid">{props.children}</div>;
}
function useFieldAttributes() {
  const field = useContext(FormItemContext);
  return {
    id: field?.id,
    'aria-describedby': field?.descriptionId,
    'aria-invalid': field?.invalid || undefined,
  };
}
type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'>;
/** 原生事件与属性原样传递，页面只负责业务值，不再拼接控件样式。 */
export function Input(props: InputProps) {
  const field = useFieldAttributes();
  return (
    <input
      {...props}
      {...field}
      type={props.type ?? 'text'}
      className={`dpr-control dpr-input ${props.className ?? ''}`}
    />
  );
}
type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'id'>;
export function Select(props: SelectProps) {
  const field = useFieldAttributes();
  return (
    <select {...props} {...field} className={`dpr-control dpr-select ${props.className ?? ''}`} />
  );
}
type TextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>;
export function Textarea(props: TextareaProps) {
  const field = useFieldAttributes();
  return (
    <textarea
      {...props}
      {...field}
      rows={props.rows ?? 4}
      className={`dpr-control dpr-textarea ${props.className ?? ''}`}
    />
  );
}
type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> & {
  label: string;
};
export function Checkbox(props: CheckboxProps) {
  const inputProps = { ...props };
  delete (inputProps as Partial<CheckboxProps>).label;
  return (
    <label className="dpr-check">
      <input {...inputProps} type="checkbox" />
      <span>{props.label}</span>
    </label>
  );
}
type FormGridProps = {
  children: React.ReactNode;
};

type RadioOption<Value extends string> = {
  value: Value;
  label: string;
  disabled?: boolean;
};
type RadioFormItemProps<Value extends string> = Omit<FormItemProps, 'children' | 'grouped'> & {
  value: Value;
  options: readonly RadioOption<Value>[];
  onChange: (value: Value) => void;
  disabled?: boolean;
};
type RadioGroupProps<Value extends string> = Pick<
  RadioFormItemProps<Value>,
  'value' | 'options' | 'onChange' | 'disabled'
>;

/** 每组使用独立 name，保留原生方向键切换、Tab 导航与禁用行为。 */
function RadioGroup<Value extends string>(props: RadioGroupProps<Value>) {
  const field = useContext(FormItemContext)!;
  return (
    <div
      className="dpr-radio-group"
      role="radiogroup"
      aria-labelledby={`${field.id}-label`}
      aria-describedby={field.descriptionId}
      aria-invalid={field.invalid || undefined}
    >
      {props.options.map((option) => (
        <label className="dpr-radio-option" key={option.value}>
          <input
            type="radio"
            name={field.id}
            value={option.value}
            checked={props.value === option.value}
            disabled={props.disabled || option.disabled}
            onChange={() => props.onChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}

/** 单选项复用 FormItem 的标题、帮助和错误展示，页面只声明选项与值。 */
export function RadioFormItem<Value extends string>(props: RadioFormItemProps<Value>) {
  return (
    <FormItem
      label={props.label}
      help={props.help}
      tooltip={props.tooltip}
      warning={props.warning}
      error={props.error}
      grouped={true}
    >
      <RadioGroup
        value={props.value}
        options={props.options}
        onChange={props.onChange}
        disabled={props.disabled}
      />
    </FormItem>
  );
}

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};
type SwitchFormItemProps = Omit<FormItemProps, 'children' | 'grouped' | 'layout' | 'hideLabel'> &
  SwitchProps;

/** 保留原生标签点击、空格切换和禁用行为，状态由页面控制。 */
function Switch(props: SwitchProps) {
  const field = useFieldAttributes();
  return (
    <input
      {...field}
      className="dpr-switch"
      type="checkbox"
      role="switch"
      checked={props.checked}
      disabled={props.disabled}
      onChange={(event) => props.onChange(event.target.checked)}
    />
  );
}

/** 开关与标签同行，说明和错误复用 FormItem 的可访问性关联。 */
export function SwitchFormItem(props: SwitchFormItemProps) {
  return (
    <div className="dpr-switch-form-item">
      <FormItem
        label={props.label}
        help={props.help}
        tooltip={props.tooltip}
        warning={props.warning}
        error={props.error}
        layout="inline"
      >
        <Switch checked={props.checked} onChange={props.onChange} disabled={props.disabled} />
      </FormItem>
    </div>
  );
}
