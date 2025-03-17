import db from '@renderer/databases'
import i18n from '@renderer/i18n'
import { deleteMessageFiles } from '@renderer/services/MessagesService'
import store from '@renderer/store'
import { updateTopic } from '@renderer/store/assistants'
import { prepareTopicMessages } from '@renderer/store/messages'
import { removeTopicInfo, updateTopicInfo } from '@renderer/store/topicInfo'
import { Assistant, Topic } from '@renderer/types'
import { find, isEmpty } from 'lodash'
import { useEffect, useState } from 'react'

import { useAssistant } from './useAssistant'
import { getStoreSetting } from './useSettings'

export function useActiveTopic(_assistant: Assistant, topic?: Topic) {
  const { assistant } = useAssistant(_assistant.id)
  const [activeTopic, setActiveTopic] = useState(topic || assistant?.topics[0])

  useEffect(() => {
    if (activeTopic && activeTopic.assistantId === _assistant.id) {
      console.log('activeTopic', activeTopic)
      console.log('assistant', _assistant)
      store.dispatch(
        updateTopicInfo({
          id: activeTopic.id,
          assistantId: activeTopic.assistantId,
          assistantEmoji: _assistant.emoji,
          name: activeTopic.name
        })
      )
    }
  }, [activeTopic, _assistant.id, _assistant.emoji, _assistant])

  useEffect(() => {
    if (activeTopic) {
      store.dispatch(prepareTopicMessages(activeTopic))
    }
  }, [activeTopic])

  useEffect(() => {
    // activeTopic not in assistant.topics
    if (assistant && !find(assistant.topics, { id: activeTopic?.id })) {
      setActiveTopic(assistant.topics[0])
    }
  }, [activeTopic?.id, assistant])

  return { activeTopic, setActiveTopic }
}

export function useTopic(assistant: Assistant, topicId?: string) {
  return assistant?.topics.find((topic) => topic.id === topicId)
}

export function getTopic(assistant: Assistant, topicId: string) {
  return assistant?.topics.find((topic) => topic.id === topicId)
}

export async function getTopicById(topicId: string) {
  const assistants = store.getState().assistants.assistants
  const topics = assistants.map((assistant) => assistant.topics).flat()
  const topic = topics.find((topic) => topic.id === topicId)
  const messages = await TopicManager.getTopicMessages(topicId)
  return { ...topic, messages } as Topic
}

export const autoRenameTopic = async (
  assistant: Assistant,
  topicId: string,
  setActiveTopic?: (topic: Topic) => void
) => {
  const topic = await getTopicById(topicId)
  const enableTopicNaming = getStoreSetting('enableTopicNaming')

  if (isEmpty(topic.messages)) {
    return
  }

  if (!enableTopicNaming) {
    const topicName = topic.messages[0]?.content.substring(0, 50)
    if (topicName) {
      const data = { ...topic, name: topicName } as Topic
      setActiveTopic && setActiveTopic(data)
      store.dispatch(updateTopic({ assistantId: assistant.id, topic: data }))
      store.dispatch(
        updateTopicInfo({ id: topicId, assistantId: assistant.id, assistantEmoji: assistant.emoji, name: topicName })
      )
      return data
    }
    return
  }

  if (topic && topic.name === i18n.t('chat.default.topic.name') && topic.messages.length >= 2) {
    const { fetchMessagesSummary } = await import('@renderer/services/ApiService')
    const summaryText = await fetchMessagesSummary({ messages: topic.messages, assistant })
    if (summaryText) {
      const data = { ...topic, name: summaryText }
      setActiveTopic && setActiveTopic(data)
      store.dispatch(updateTopic({ assistantId: assistant.id, topic: data }))
      store.dispatch(
        updateTopicInfo({ id: topicId, assistantId: assistant.id, assistantEmoji: assistant.emoji, name: summaryText })
      )
    }
  }
  return
}

// Convert class to object with functions since class only has static methods
// 只有静态方法,没必要用class，可以export {}
export const TopicManager = {
  async getTopicLimit(limit: number) {
    return await db.topics
      .orderBy('updatedAt') // 按 updatedAt 排序（默认升序）
      .reverse() // 逆序（变成降序）
      .limit(limit) // 取前 10 条
      .toArray()
  },

  async getTopic(id: string) {
    return await db.topics.get(id)
  },

  async getAllTopics() {
    return await db.topics.toArray()
  },

  async getTopicMessages(id: string) {
    const topic = await TopicManager.getTopic(id)
    return topic ? topic.messages : []
  },

  async removeTopic(id: string) {
    const messages = await TopicManager.getTopicMessages(id)

    for (const message of messages) {
      await deleteMessageFiles(message)
    }

    db.topics.delete(id)
    store.dispatch(removeTopicInfo(id))
  },

  async clearTopicMessages(id: string) {
    const topic = await TopicManager.getTopic(id)

    if (topic) {
      for (const message of topic?.messages ?? []) {
        await deleteMessageFiles(message)
      }

      topic.messages = []

      await db.topics.update(id, topic)
    }
  }
}
