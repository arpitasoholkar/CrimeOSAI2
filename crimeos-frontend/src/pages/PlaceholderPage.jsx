import { motion } from 'framer-motion'
import styles from './PlaceholderPage.module.css'

export default function PlaceholderPage({ title, description }) {
  return (
    <motion.div
      className={styles.wrap}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>
    </motion.div>
  )
}
