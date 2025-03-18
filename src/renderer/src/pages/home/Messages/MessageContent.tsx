import { SearchOutlined, SyncOutlined, TranslationOutlined } from '@ant-design/icons'
import { isOpenAIWebSearch } from '@renderer/config/models'
import { getModelUniqId } from '@renderer/services/ModelService'
import { Message, Model } from '@renderer/types'
import { getBriefInfo } from '@renderer/utils'
import { withMessageThought } from '@renderer/utils/formats'
import { Divider, Flex } from 'antd'
import { clone } from 'lodash'
import React, { Fragment, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import BarLoader from 'react-spinners/BarLoader'
import BeatLoader from 'react-spinners/BeatLoader'
import styled from 'styled-components'

import Markdown from '../Markdown/Markdown'
import CitationsList from './CitationsList'
import MessageAttachments from './MessageAttachments'
import MessageError from './MessageError'
import MessageThought from './MessageThought'
import MessageTools from './MessageTools'

interface Props {
  message: Message
  model?: Model
}

const MessageContent: React.FC<Props> = ({ message: _message, model }) => {
  const { t } = useTranslation()
  const message = withMessageThought(clone(_message))
  const isWebCitation = model && (isOpenAIWebSearch(model) || model.provider === 'openrouter')

  // Process content to make citation numbers clickable
  const processedContent = useMemo(() => {
    if (!(message.metadata?.citations || message.metadata?.webSearch)) {
      return message.content
    }

    let content = message.content

    const searchResultsCitations = message?.metadata?.webSearch?.results?.map((result) => result.url) || []

    const citations = message?.metadata?.citations || searchResultsCitations

    // Convert [n] format to superscript numbers and make them clickable
    // Use <sup> tag for superscript and make it a link
    content = content.replace(/\[(\d+)\]/g, (match, num) => {
      const index = parseInt(num) - 1
      if (index >= 0 && index < citations.length) {
        const link = citations[index]
        return link ? `[<sup>${num}</sup>](${link})` : `<sup>${num}</sup>`
      }
      return match
    })

    return content
  }, [message.content, message.metadata])

  // Format citations for display
  const formattedCitations = useMemo(() => {
    if (!message.metadata?.citations?.length && !message.metadata?.annotations?.length) return null

    if (model && isOpenAIWebSearch(model)) {
      return message.metadata.annotations?.map((url, index) => {
        return { number: index + 1, url: url.url_citation?.url, hostname: url.url_citation.title }
      })
    }

    return message.metadata?.citations?.map((url, index) => {
      try {
        const hostname = new URL(url).hostname
        return { number: index + 1, url, hostname }
      } catch {
        return { number: index + 1, url, hostname: url }
      }
    })
  }, [message.metadata?.citations, message.metadata?.annotations, model])

  if (message.status === 'sending') {
    return (
      <MessageContentLoading>
        <SyncOutlined spin size={24} />
      </MessageContentLoading>
    )
  }

  if (message.status === 'searching') {
    return (
      <SearchingContainer>
        <SearchOutlined size={24} />
        <SearchingText>{t('message.searching')}</SearchingText>
        <BarLoader color="#1677ff" />
      </SearchingContainer>
    )
  }

  if (message.status === 'error') {
    return <MessageError message={message} />
  }

  if (message.type === '@' && model) {
    const content = `[@${model.name}](#)  ${getBriefInfo(message.content)}`
    return <Markdown message={{ ...message, content }} />
  }

  return (
    <Fragment>
      <Flex gap="8px" wrap style={{ marginBottom: 10 }}>
        {message.mentions?.map((model) => <MentionTag key={getModelUniqId(model)}>{'@' + model.name}</MentionTag>)}
      </Flex>
      <MessageThought message={message} />
      <MessageTools message={message} />
      <Markdown message={{ ...message, content: processedContent }} />
      {message.translatedContent && (
        <Fragment>
          <Divider style={{ margin: 0, marginBottom: 10 }}>
            <TranslationOutlined />
          </Divider>
          {message.translatedContent === t('translate.processing') ? (
            <BeatLoader color="var(--color-text-2)" size="10" style={{ marginBottom: 15 }} />
          ) : (
            <Markdown message={{ ...message, content: message.translatedContent }} />
          )}
        </Fragment>
      )}
      {message?.metadata?.groundingMetadata && message.status == 'success' && (
        <>
          <CitationsList
            citations={message.metadata.groundingMetadata.groundingChunks.map((chunk, index) => ({
              number: index + 1,
              url: chunk.web?.uri,
              title: chunk.web?.title,
              showFavicon: false
            }))}
          />
          <SearchEntryPoint
            dangerouslySetInnerHTML={{
              __html: message.metadata.groundingMetadata.searchEntryPoint?.renderedContent
                ?.replace(/@media \(prefers-color-scheme: light\)/g, 'body[theme-mode="light"]')
                .replace(/@media \(prefers-color-scheme: dark\)/g, 'body[theme-mode="dark"]')
            }}
          />
        </>
      )}
      {formattedCitations && (
        <CitationsList
          citations={formattedCitations.map((citation) => ({
            number: citation.number,
            url: citation.url,
            hostname: citation.hostname,
            showFavicon: isWebCitation
          }))}
        />
      )}
      {message?.metadata?.webSearch && message.status === 'success' && (
        <CitationsList
          citations={message.metadata.webSearch.results.map((result, index) => ({
            number: index + 1,
            url: result.url,
            title: result.title,
            showFavicon: true
          }))}
        />
      )}
      {message?.metadata?.webSearchZhipu && message.status === 'success' && (
        <CitationsList
          citations={message.metadata.webSearchZhipu.map((result, index) => ({
            number: index + 1,
            url: result.link,
            title: result.title,
            showFavicon: true
          }))}
        />
      )}
      <MessageAttachments message={message} />
    </Fragment>
  )
}

const MessageContentLoading = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 32px;
  margin-top: -5px;
  margin-bottom: 5px;
`

const SearchingContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: var(--color-background-mute);
  padding: 10px;
  border-radius: 10px;
  margin-bottom: 10px;
  gap: 10px;
`

const MentionTag = styled.span`
  color: var(--color-link);
`

const SearchingText = styled.div`
  font-size: 14px;
  line-height: 1.6;
  text-decoration: none;
  color: var(--color-text-1);
`

const SearchEntryPoint = styled.div`
  margin: 10px 2px;
`

export default React.memo(MessageContent)
