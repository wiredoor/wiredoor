import { Inline } from '@/components/foundations'
import { Icon } from '@/components/foundations/icon'
import { Button } from '@/components/ui/button'

export function Footer() {
  return (
    <Inline justify="between" align="center">
      <Inline gap={0}>
        <Button variant="link" as-child>
          <a href="https://www.wiredoor.net?ref=wiredoor-foss" target="_blank" rel="noopener noreferrer">
            &copy; Wiredoor
          </a>
        </Button>
        <Button variant="link" as-child>
          <a href="https://github.com/wiredoor/wiredoor/blob/main/TERMS.md?ref=wiredoor-foss" target="_blank" rel="noopener noreferrer">
            Terms & Conditions
          </a>
        </Button>
      </Inline>
      <Inline gap={0} >
        <Button variant="link" size="icon-sm" as-child>
          <a href="https://github.com/wiredoor/wiredoor?ref=wiredoor-foss" target="_blank" rel="noopener noreferrer">
            <Icon name="github" />
          </a>
        </Button>
      </Inline>
    </Inline>
  )
}